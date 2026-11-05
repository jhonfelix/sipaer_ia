"""Texto de arquivos anexados no chat: acumula por sessão e formata para o prompt.

Problemas que isto resolve (diagnosticados em 2026-11-04):
- o texto extraído só ia na mensagem em que o arquivo foi anexado; na mensagem
  seguinte o modelo "esquecia" o documento e pedia o upload de novo;
- o texto entrava como "contexto" genérico, e skills que mandam "ler o PDF"
  faziam o modelo pedir o arquivo mesmo tendo o conteúdo no prompt.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation

# Teto de caracteres de anexos reenviados ao modelo (~40k tokens).
MAX_ATTACHMENT_CHARS = 160_000


async def session_attachments(
    db: AsyncSession, user_id: int, session_id: str | None, new_context: str
) -> str:
    """Anexos anteriores da sessão + o desta mensagem, dos mais recentes aos mais
    antigos, até o teto. Retorna o texto bruto (sem o cabeçalho de instrução)."""
    parts: list[str] = []
    if new_context.strip():
        parts.append(new_context.strip())
    if session_id:
        rows = await db.execute(
            select(Conversation.attachment_context)
            .where(
                Conversation.user_id == user_id,
                Conversation.session_id == session_id,
                Conversation.role == "user",
                Conversation.attachment_context.is_not(None),
            )
            .order_by(Conversation.id.desc())
        )
        for (ctx,) in rows.all():
            if ctx and ctx.strip() and ctx.strip() not in parts:
                parts.append(ctx.strip())

    kept: list[str] = []
    total = 0
    for p in parts:
        if total + len(p) > MAX_ATTACHMENT_CHARS:
            if not kept:  # um único anexo maior que o teto: trunca
                kept.append(p[:MAX_ATTACHMENT_CHARS] + "\n…[anexo truncado]")
            break
        kept.append(p)
        total += len(p)
    # Ordem cronológica no prompt (o mais antigo primeiro).
    return "\n\n---\n\n".join(reversed(kept))


def attachment_block(text: str) -> str:
    """Bloco de prompt que deixa explícito que o documento já foi lido."""
    if not text.strip():
        return ""
    return (
        "\n\n# Documentos anexados pelo usuário nesta conversa\n"
        "O conteúdo abaixo é o TEXTO JÁ EXTRAÍDO dos arquivos que o usuário anexou. "
        "Você tem acesso integral a ele: trabalhe diretamente sobre este texto e NÃO peça "
        "para o usuário enviar, anexar ou fazer upload do arquivo. Se alguma instrução "
        "(inclusive de uma skill) mandar ler, abrir ou extrair o arquivo, considere essa "
        "etapa já concluída com o texto abaixo. Você não gera arquivos (PDF/DOCX): entregue "
        "o resultado como texto formatado em markdown.\n"
        "<documentos_anexados>\n"
        f"{text}\n"
        "</documentos_anexados>"
    )
