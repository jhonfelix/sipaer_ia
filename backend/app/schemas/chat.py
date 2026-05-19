from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    message: str
    report_id: int | None = None
    context: str = ""


class ChatResponse(BaseModel):
    id: str
    role: str = "assistant"
    content: str
    sources: list[str] = []
    timestamp: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    sources: list[str]
    created_at: datetime
