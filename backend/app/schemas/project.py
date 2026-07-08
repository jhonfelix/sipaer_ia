from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

ALLOWED_PROJECT_CHAT_TYPES = {"general", "da"}


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    instructions: str | None = None
    chat_type: str = "general"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name cannot be empty")
        return v.strip()

    @field_validator("chat_type")
    @classmethod
    def validate_chat_type(cls, v: str) -> str:
        if v not in ALLOWED_PROJECT_CHAT_TYPES:
            raise ValueError(
                f"chat_type must be one of: {', '.join(sorted(ALLOWED_PROJECT_CHAT_TYPES))}"
            )
        return v


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    instructions: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("name cannot be empty")
        return v.strip() if v is not None else v


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    color: str | None
    icon: str | None
    instructions: str | None
    chat_type: str
    created_by: int
    created_at: datetime
    updated_at: datetime


class ProjectDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    source: str
    status: str
    chunk_count: int
    original_name: str | None
    size_bytes: int
    error_msg: str | None
    added_by: int
    created_at: datetime
    updated_at: datetime
