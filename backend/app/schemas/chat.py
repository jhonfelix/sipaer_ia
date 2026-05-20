from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    message: str
    report_id: int | None = None
    context: str = ""
    session_id: str | None = None


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
