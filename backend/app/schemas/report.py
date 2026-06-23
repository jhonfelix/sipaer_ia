from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SubsectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    order: int
    content: str
    is_completed: bool


class SubsectionUpdate(BaseModel):
    content: str | None = None
    is_completed: bool | None = None


class SectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    order: int
    content: str
    is_completed: bool
    subsections: list[SubsectionResponse] = []


class SectionUpdate(BaseModel):
    content: str | None = None
    is_completed: bool | None = None
    subsections: dict[str, SubsectionUpdate] | None = None


class ReportCreate(BaseModel):
    occurrence: dict
    sections: list[dict] = []


class ReportUpdate(BaseModel):
    status: str | None = None
    occurrence: dict | None = None
    sections: dict[str, SectionUpdate] | None = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    version: int
    occurrence: dict
    created_by: int
    last_edited_by: int
    generation_status: str | None = None
    created_at: datetime
    updated_at: datetime
    sections: list[SectionResponse] = []

    @property
    def progress(self) -> dict:
        all_subs = [sub for s in self.sections for sub in s.subsections]
        total = len(all_subs) if all_subs else len(self.sections)
        completed = (
            sum(1 for s in all_subs if s.is_completed)
            if all_subs
            else sum(1 for s in self.sections if s.is_completed)
        )
        return {"total": total, "completed": completed}
