from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

DOC_TYPES = {"regulation", "manual", "procedure", "report", "other"}


class KnowledgeTextCreate(BaseModel):
    title: str
    source: str
    doc_type: str
    content: str

    @field_validator("doc_type")
    @classmethod
    def validate_doc_type(cls, v: str) -> str:
        if v not in DOC_TYPES:
            raise ValueError(f"doc_type must be one of: {', '.join(sorted(DOC_TYPES))}")
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
    doc_type: str
    status: str
    chunk_count: int
    original_name: str | None
    size_bytes: int
    error_msg: str | None
    added_by: int
    created_at: datetime
    updated_at: datetime
