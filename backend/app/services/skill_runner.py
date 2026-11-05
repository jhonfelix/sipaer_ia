"""Execução de scripts de skills com isolamento básico.

Controles aplicados (o container do backend roda como root):
- roda como usuário `nobody` (uid/gid 65534), num diretório temporário próprio;
- ambiente limpo — NÃO herda as variáveis do backend (CCABR_API_KEY, SECRET_KEY,
  senhas do MySQL etc.);
- limites de recursos (CPU, memória, tamanho de arquivo, nº de processos);
- timeout com kill do grupo de processos inteiro;
- saída truncada.

Limitação conhecida: o script ainda tem acesso à rede do container (MySQL,
Qdrant, Redis e CCABR são alcançáveis, mas sem credenciais). Por isso todo script
exige aprovação de um administrador antes de rodar.
"""
from __future__ import annotations

import asyncio
import os
import re
import resource
import signal
import subprocess
import tempfile
from pathlib import Path

NOBODY_UID = 65534
NOBODY_GID = 65534

DEFAULT_TIMEOUT = 30
MAX_TIMEOUT = 60
MAX_OUTPUT_CHARS = 20_000
MAX_ARGS = 20
MAX_ARG_LEN = 2_000

FILENAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,80}\.(py|sh)$")

_INTERPRETERS = {
    ".py": ["python3", "-I"],  # -I: modo isolado (ignora PYTHON* env e site do usuário)
    ".sh": ["sh"],
}


def _limit_resources(cpu_seconds: int) -> None:
    """Roda no processo filho, depois do setuid — só reduz limites."""
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_FSIZE, (10 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + f"\n…[saída truncada em {MAX_OUTPUT_CHARS} caracteres]"


async def run_script(
    filename: str,
    content: str,
    args: list[str] | None = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict:
    """Executa o script e devolve {stdout, stderr, returncode} ou {error}."""
    if not FILENAME_RE.match(filename):
        return {"error": f"Nome de script inválido: {filename}"}
    args = [str(a) for a in (args or [])]
    if len(args) > MAX_ARGS or any(len(a) > MAX_ARG_LEN for a in args):
        return {"error": f"Argumentos excedem o limite ({MAX_ARGS} args de até {MAX_ARG_LEN} caracteres)"}
    timeout = max(1, min(int(timeout or DEFAULT_TIMEOUT), MAX_TIMEOUT))

    # Thread + subprocess síncrono: o uvloop (uvicorn[standard]) não aceita
    # user/group em create_subprocess_exec.
    return await asyncio.to_thread(_run_sync, filename, content, args, timeout)


def _run_sync(filename: str, content: str, args: list[str], timeout: int) -> dict:
    interpreter = _INTERPRETERS[Path(filename).suffix]

    with tempfile.TemporaryDirectory(prefix="skill-") as workdir:
        os.chown(workdir, NOBODY_UID, NOBODY_GID)
        script_path = Path(workdir) / filename
        script_path.write_text(content, encoding="utf-8")
        os.chmod(script_path, 0o644)

        env = {
            "PATH": "/usr/local/bin:/usr/bin:/bin",
            "HOME": workdir,
            "LANG": "C.UTF-8",
            "PYTHONIOENCODING": "utf-8",
        }
        try:
            proc = subprocess.Popen(
                [*interpreter, str(script_path), *args],
                cwd=workdir,
                env=env,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                user=NOBODY_UID,
                group=NOBODY_GID,
                extra_groups=[],
                start_new_session=True,
                preexec_fn=lambda: _limit_resources(timeout + 1),
            )
        except FileNotFoundError as exc:
            return {"error": f"Interpretador não encontrado: {exc}"}

        try:
            stdout, stderr = proc.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(proc.pid, signal.SIGKILL)  # mata filhos também
            except ProcessLookupError:
                pass
            proc.communicate()
            return {"error": f"Tempo de execução excedido ({timeout}s)"}

    return {
        "stdout": _truncate(stdout.decode("utf-8", errors="replace")),
        "stderr": _truncate(stderr.decode("utf-8", errors="replace")),
        "returncode": proc.returncode,
    }
