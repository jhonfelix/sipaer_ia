import json
import logging
import re

from app.schemas.transcription import ROLES, TranscriptAnalysis, TranscriptionResponse
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


def _fix_encoding(text: str) -> str:
    """Corrige double-encoding UTF-8 do servidor Whisper.

    O endpoint devolve, p.ex., "avião" como "aviÃ£o" (bytes UTF-8 lidos como
    latin-1). Refaz o caminho: latin-1 → utf-8. Se a string não for mojibake
    (não representável em latin-1, ou não for utf-8 válido), devolve o original.
    """
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


def _fmt_ts(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"


_ANALYSIS_PROMPT = """Você é um perito do CENIPA/FAB analisando a transcrição de um áudio \
de investigação de acidente aeronáutico (CVR, rádio ATC, entrevista ou gravação de campo).

O Whisper NÃO identifica quem falou. A partir do CONTEÚDO e do contexto, você deve:
1. Agrupar os trechos em FALANTES distintos (S1, S2, S3...).
2. Inferir o PAPEL de cada falante, escolhendo EXATAMENTE um destes rótulos: {roles}.
   Use "Indeterminado" quando o contexto não permitir inferir com segurança.
3. Produzir um resumo executivo do diálogo.
4. Extrair fatos-chave com âncora temporal.
5. Apontar terminologia/fraseologia aeronáutica relevante ou irregular.
6. Marcar trechos com indícios de stress/urgência (a partir do texto, não do áudio).

Trechos transcritos (com timestamps em segundos):
{segments}

Responda SOMENTE com um objeto JSON válido, sem markdown, exatamente neste formato:
{{
  "speakers": [{{"id": "S1", "role": "Piloto", "confidence": 92, "reason": "..."}}],
  "turns": [{{"start": 0.0, "end": 8.5, "speaker": "S1", "role": "Piloto", "text": "..."}}],
  "summary": "...",
  "key_facts": [{{"time": "00:03", "fact": "..."}}],
  "terminology": [{{"term": "...", "note": "..."}}],
  "stress": [{{"start": 0.0, "end": 8.5, "level": "alto", "reason": "..."}}]
}}

Regras: confidence é inteiro 0-100; level é "baixo", "medio" ou "alto"; todo texto em \
português; não invente trechos — use apenas os fornecidos."""


def _parse_json(raw: str) -> dict:
    """Extrai o primeiro objeto JSON da resposta do LLM (tolera cercas markdown)."""
    cleaned = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


async def analyze(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    language: str = "pt",
    model: str = "gpt-oss-120b",
) -> TranscriptionResponse:
    raw = await llm_service.transcribe_audio(file_bytes, filename, content_type, language)

    full_text = _fix_encoding(raw.get("text", "").strip())
    segments = raw.get("segments") or []
    detected_lang = raw.get("language") or language
    try:
        duration = float(raw.get("duration") or 0.0)
    except (TypeError, ValueError):
        duration = 0.0

    if not segments:
        # Sem fala detectada — devolve transcrição vazia sem chamar o LLM.
        return TranscriptionResponse(
            text=full_text,
            language=detected_lang,
            duration=duration,
            analysis=TranscriptAnalysis(),
        )

    lines = []
    for seg in segments:
        seg_text = _fix_encoding((seg.get("text") or "").strip())
        lines.append(f"[{seg.get('start', 0):.1f}s - {seg.get('end', 0):.1f}s] {seg_text}")

    prompt = _ANALYSIS_PROMPT.format(
        roles=", ".join(ROLES),
        segments="\n".join(lines),
    )

    analysis = TranscriptAnalysis()
    try:
        completion = await llm_service.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=0.2,
        )
        data = _parse_json(completion)
        analysis = TranscriptAnalysis.model_validate(data)
    except Exception:
        logger.exception("Falha ao analisar transcrição com o LLM")
        # Fallback: pelo menos devolve os trechos brutos como turns sem papel.
        analysis = TranscriptAnalysis(
            turns=[
                {
                    "start": float(seg.get("start", 0)),
                    "end": float(seg.get("end", 0)),
                    "speaker": "S1",
                    "role": "Indeterminado",
                    "text": _fix_encoding((seg.get("text") or "").strip()),
                }
                for seg in segments
            ]
        )

    return TranscriptionResponse(
        text=full_text,
        language=detected_lang,
        duration=duration,
        analysis=analysis,
    )
