from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

ALLOWED_MODELS = Literal["gpt-oss-120b", "gemma-4-26B-A4B-it"]
ALLOWED_CHAT_TYPES = Literal["general", "report", "da", "translation", "images", "juridical", "fab-docs"]


class ChatRequest(BaseModel):
    message: str
    report_id: int | None = None
    context: str = ""
    session_id: str | None = None
    model: ALLOWED_MODELS = "gpt-oss-120b"
    chat_type: ALLOWED_CHAT_TYPES = "general"


class ChatResponse(BaseModel):
    id: str
    role: str = "assistant"
    content: str
    sources: list[str] = []
    session_id: str
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    sources: list[str]
    session_id: str | None
    created_at: datetime


class ConversationSessionResponse(BaseModel):
    session_id: str
    title: str
    preview: str
    message_count: int
    updated_at: datetime
    category: str
