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


class WebDiscoverRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("url cannot be empty")
        if not (v.startswith("http://") or v.startswith("https://")):
            v = f"https://{v}"
        return v


class WebLinkItem(BaseModel):
    url: str
    text: str
    same_domain: bool


class WebDiscoverResponse(BaseModel):
    source_url: str
    title: str
    links: list[WebLinkItem]


class WebImportRequest(BaseModel):
    urls: list[str]
    collection: str
    source: str | None = None

    @field_validator("collection")
    @classmethod
    def validate_collection(cls, v: str) -> str:
        if v not in VALID_COLLECTIONS:
            raise ValueError(f"collection must be one of: {', '.join(sorted(VALID_COLLECTIONS))}")
        return v

    @field_validator("urls")
    @classmethod
    def validate_urls(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("urls cannot be empty")
        # Deve acompanhar o limite de links retornados por discover_links (ingestion_service.py)
        if len(v) > 300:
            raise ValueError("máximo de 300 URLs por importação")
        return v


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
