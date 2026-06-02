from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.config import KNOWLEDGE_COLLECTIONS

VALID_COLLECTIONS = set(KNOWLEDGE_COLLECTIONS.keys())


class KnowledgeTextCreate(BaseModel):
    title: str
    source: str
    collection: str
    content: str

    @field_validator("collection")
    @classmethod
    def validate_collection(cls, v: str) -> str:
        if v not in VALID_COLLECTIONS:
            raise ValueError(f"collection must be one of: {', '.join(sorted(VALID_COLLECTIONS))}")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content cannot be empty")
        return v

    @field_validator("title", "source")
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("field cannot be empty")
        return v.strip()


class KnowledgeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    source: str
    collection: str
    status: str
    chunk_count: int
    original_name: str | None
    size_bytes: int
    error_msg: str | None
    added_by: int
    created_at: datetime
    updated_at: datetime
