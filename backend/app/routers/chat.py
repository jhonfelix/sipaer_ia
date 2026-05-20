from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.database import AsyncSession, get_db
from app.middleware.auth import get_current_user
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    ConversationSessionResponse,
)
from app.services.rag_pipeline import rag_pipeline

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        content, sources = await rag_pipeline.process(body.message, body.context)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Erro ao processar resposta da IA",
        )

    session_id = body.session_id or str(uuid4())
    now = datetime.now(timezone.utc)

    user_msg = Conversation(
        user_id=current_user.id,
        report_id=body.report_id,
        session_id=session_id,
        role="user",
        content=body.message,
        sources=[],
    )
    ai_msg = Conversation(
        user_id=current_user.id,
        report_id=body.report_id,
        session_id=session_id,
        role="assistant",
        content=content,
        sources=sources,
    )
    db.add(user_msg)
    db.add(ai_msg)
    await db.commit()

    return ChatResponse(
        id=str(ai_msg.id),
        content=content,
        sources=sources,
        session_id=session_id,
        created_at=now,
    )


@router.get("/sessions", response_model=list[ConversationSessionResponse])
async def sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.user_id == current_user.id,
            Conversation.session_id.isnot(None),
        )
        .order_by(Conversation.session_id, Conversation.created_at)
    )
    rows = result.scalars().all()

    sessions_dict: dict[str, list[Conversation]] = {}
    for row in rows:
        sessions_dict.setdefault(row.session_id, []).append(row)  # type: ignore[index]

    out: list[ConversationSessionResponse] = []
    for sid, msgs in sessions_dict.items():
        first_user = next((m for m in msgs if m.role == "user"), None)
        last_msg = msgs[-1]
        raw_title = first_user.content if first_user else "Conversa"
        title = raw_title[:50] + ("…" if len(raw_title) > 50 else "")
        preview = last_msg.content[:60] + ("…" if len(last_msg.content) > 60 else "")
        out.append(
            ConversationSessionResponse(
                session_id=sid,
                title=title,
                preview=preview,
                message_count=len(msgs),
                updated_at=last_msg.created_at,
            )
        )

    out.sort(key=lambda s: s.updated_at, reverse=True)
    return out


@router.get("/history", response_model=list[ConversationResponse])
async def history(
    session_id: str | None = None,
    report_id: int | None = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at)
        .limit(limit)
    )
    if session_id is not None:
        query = query.where(Conversation.session_id == session_id)
    if report_id is not None:
        query = query.where(Conversation.report_id == report_id)

    result = await db.execute(query)
    return list(result.scalars().all())
