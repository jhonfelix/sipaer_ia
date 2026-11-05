"""Skills do SIPAER para o agente Agno, carregadas do MySQL (não do disco).

Usa a integração nativa do Agno (`Agent(skills=...)`: catálogo no prompt + tools
de acesso), mas com duas diferenças em relação ao `agno.skills.Skills` padrão:

1. As skills vêm do banco (criadas pela interface), não de pastas `SKILL.md`.
2. **Instruções antes de scripts**: no teste de viabilidade (2026-11-04) o
   gpt-oss-120b chamava `get_skill_script` direto, sem ler as instruções, e
   ignorava o formato pedido pela skill. Aqui, se o script rodar antes das
   instruções terem sido carregadas nesta execução, a resposta da tool já leva
   as instruções junto, para o modelo segui-las ao apresentar o resultado.

Scripts só executam se aprovados por um admin (ver `services/skill_runner.py`).
"""
from __future__ import annotations

import json

from agno.skills import Skill as AgnoSkill
from agno.skills import Skills
from agno.skills.loaders.base import SkillLoader
from agno.tools.function import Function

from app.services.skill_runner import run_script
from app.services.skill_service import LoadedSkill


class _StaticLoader(SkillLoader):
    def __init__(self, skills: list[LoadedSkill]):
        self._skills = skills

    def load(self) -> list[AgnoSkill]:
        return [
            AgnoSkill(
                name=s.name,
                description=s.description,
                instructions=s.instructions,
                source_path="",
                scripts=list(s.scripts),
                references=[],
            )
            for s in self._skills
        ]


class SipaerSkills(Skills):
    """Instância por requisição — guarda quais skills tiveram instruções carregadas."""

    def __init__(self, skills: list[LoadedSkill], preloaded: set[str] | None = None):
        self._data = {s.name: s for s in skills}
        # Skills ativadas explicitamente já têm as instruções no prompt.
        self._instructions_loaded: set[str] = set(preloaded or ())
        super().__init__(loaders=[_StaticLoader(skills)])

    # ── Prompt ──────────────────────────────────────────────────────────────

    def get_system_prompt_snippet(self) -> str:
        if not self._data:
            return ""
        lines = [
            "<skills>",
            "Skills são pacotes de instruções especializadas criados pelos usuários do SIPAER.",
            "Quando a tarefa do usuário corresponder à descrição de uma skill:",
            "1. PRIMEIRO chame `get_skill_instructions(skill_name)` e siga as instruções retornadas",
            "   (formato, estrutura e regras da resposta).",
            "2. Só depois, se as instruções mandarem, execute scripts com",
            "   `get_skill_script(skill_name, script_path, execute=True, args=[...])`.",
            "O nome da skill NÃO é uma ferramenta — use sempre as ferramentas acima.",
            "Se nenhuma skill corresponder à tarefa, responda normalmente sem usá-las.",
            "",
        ]
        for s in self._data.values():
            scripts = ", ".join(s.scripts) if s.scripts else "nenhum"
            lines += [
                "<skill>",
                f"  <name>{s.name}</name>",
                f"  <description>{s.description}</description>",
                f"  <scripts>{scripts}</scripts>",
                "</skill>",
            ]
        lines.append("</skills>")
        return "\n".join(lines)

    # ── Tools ───────────────────────────────────────────────────────────────

    def get_tools(self) -> list[Function]:
        return [
            Function(
                name="get_skill_instructions",
                description=(
                    "Carrega as instruções completas de uma skill. Chame ANTES de responder "
                    "uma tarefa que corresponda a uma skill do catálogo."
                ),
                entrypoint=self.get_skill_instructions,
            ),
            Function(
                name="get_skill_script",
                description=(
                    "Lê (execute=False) ou executa (execute=True) um script de uma skill. "
                    "args é a lista de argumentos de linha de comando, como strings."
                ),
                entrypoint=self.get_skill_script,
            ),
        ]

    def _not_found(self, skill_name: str) -> str:
        return json.dumps(
            {"error": f"Skill '{skill_name}' não encontrada", "skills_disponiveis": list(self._data)},
            ensure_ascii=False,
        )

    async def get_skill_instructions(self, skill_name: str) -> str:
        """Carrega as instruções completas de uma skill.

        Args:
            skill_name: Nome da skill (campo <name> do catálogo).
        """
        skill = self._data.get(skill_name)
        if skill is None:
            return self._not_found(skill_name)
        self._instructions_loaded.add(skill_name)
        return json.dumps(
            {
                "skill_name": skill.name,
                "instructions": skill.instructions,
                "scripts": list(skill.scripts),
            },
            ensure_ascii=False,
        )

    async def get_skill_script(
        self,
        skill_name: str,
        script_path: str,
        execute: bool = False,
        args: list[str] | None = None,
    ) -> str:
        """Lê ou executa um script de uma skill.

        Args:
            skill_name: Nome da skill.
            script_path: Nome do arquivo do script (ex.: calc.py).
            execute: True para executar; False para apenas ler o conteúdo.
            args: Argumentos de linha de comando passados ao script (lista de strings).
        """
        skill = self._data.get(skill_name)
        if skill is None:
            return self._not_found(skill_name)
        script = skill.scripts.get(script_path)
        if script is None:
            return json.dumps(
                {"error": f"Script '{script_path}' não existe", "scripts": list(skill.scripts)},
                ensure_ascii=False,
            )

        if not execute:
            return json.dumps(
                {"skill_name": skill_name, "script_path": script_path, "content": script.content},
                ensure_ascii=False,
            )

        if not script.approved:
            return json.dumps(
                {
                    "error": (
                        f"O script '{script_path}' ainda não foi aprovado por um administrador e "
                        "não pode ser executado. Informe isso ao usuário."
                    )
                },
                ensure_ascii=False,
            )

        result = await run_script(script.filename, script.content, args)
        payload: dict = {"skill_name": skill_name, "script_path": script_path, **result}
        if skill_name not in self._instructions_loaded:
            # Modelo pulou as instruções: entrega junto, para ele seguir o formato pedido.
            self._instructions_loaded.add(skill_name)
            payload["instrucoes_da_skill"] = skill.instructions
            payload["aviso"] = (
                "Você executou o script sem carregar as instruções da skill. "
                "Siga as instruções acima ao apresentar o resultado."
            )
        return json.dumps(payload, ensure_ascii=False)
