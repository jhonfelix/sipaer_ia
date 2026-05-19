from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import AsyncSession, get_db
from app.middleware.auth import get_current_user
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ConversationResponse
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

    # Step 7: Salvar conversa no MySQL
    user_msg = Conversation(
        user_id=current_user.id,
        report_id=body.report_id,
        role="user",
        content=body.message,
        sources=[],
    )
    ai_msg = Conversation(
        user_id=current_user.id,
        report_id=body.report_id,
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
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/history", response_model=list[ConversationResponse])
async def history(
    report_id: int | None = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    query = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
        .limit(limit)
    )
    if report_id is not None:
        query = query.where(Conversation.report_id == report_id)

    result = await db.execute(query)
    return list(result.scalars().all())
