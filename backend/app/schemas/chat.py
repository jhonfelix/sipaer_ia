from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_MODELS = Literal["gpt-oss-120b", "gemma-4-26B-A4B-it"]
ALLOWED_CHAT_TYPES = Literal["general", "report", "da", "translation", "images", "juridical", "fab-docs"]


class ChatRequest(BaseModel):
    message: str
    report_id: int | None = None
    project_id: int | None = None
    context: str = ""
    # Texto extraído (via /chat/extract) dos arquivos anexados nesta mensagem.
    # Fica salvo na sessão e é reenviado ao modelo nas mensagens seguintes.
    attachments: str = Field(default="", max_length=1_000_000)
    session_id: str | None = None
    model: ALLOWED_MODELS = "gpt-oss-120b"
    chat_type: ALLOWED_CHAT_TYPES = "general"
    images: list[str] = []
    # Skills ativadas explicitamente (seletor ou /atalho no chat)
    skill_ids: list[int] = []

    @field_validator("images")
    @classmethod
    def _validate_images(cls, v: list[str]) -> list[str]:
        if len(v) > 6:
            raise ValueError("Máximo de 6 imagens por mensagem")
        for img in v:
            if not img.startswith("data:image/"):
                raise ValueError("Formato de imagem inválido — esperado data URL (data:image/...)")
        return v

    @field_validator("skill_ids")
    @classmethod
    def _validate_skill_ids(cls, v: list[int]) -> list[int]:
        if len(v) > 3:
            raise ValueError("Máximo de 3 skills por mensagem")
        return v


class SourceItem(BaseModel):
    source: str
    score: float


class ChatResponse(BaseModel):
    id: str
    role: str = "assistant"
    content: str
    sources: list[SourceItem] = []
    session_id: str
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    sources: list[SourceItem]
    session_id: str | None
    created_at: datetime

    @field_validator("sources", mode="before")
    @classmethod
    def _normalize_legacy_sources(cls, v: Any) -> Any:
        # Conversas gravadas antes do reranker expor score vinham como list[str].
        if not v:
            return v
        return [{"source": s, "score": 0.0} if isinstance(s, str) else s for s in v]


class ConversationSessionResponse(BaseModel):
    session_id: str
    title: str
    preview: str
    message_count: int
    updated_at: datetime
    category: str
