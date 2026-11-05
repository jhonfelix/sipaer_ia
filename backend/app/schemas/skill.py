from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.skill_runner import FILENAME_RE

SkillScope = Literal["personal", "group", "global"]

# Mesmo formato exigido pelo padrão Agent Skills (e pelo validador do Agno):
# minúsculas, dígitos e hífens, sem hífen no início/fim nem duplo.
NAME_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"

MAX_SCRIPTS = 10


class SkillScriptIn(BaseModel):
    filename: str = Field(min_length=4, max_length=100)
    content: str = Field(min_length=1, max_length=100_000)

    @field_validator("filename")
    @classmethod
    def _filename(cls, v: str) -> str:
        if not FILENAME_RE.match(v):
            raise ValueError(
                "Nome de script inválido — use letras, números, _ ou - e extensão .py ou .sh"
            )
        return v


class SkillScriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content: str
    approved: bool
    approved_at: datetime | None
    updated_at: datetime


class SkillGroupRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class SkillOwnerRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    posto_graduacao: str | None


class SkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    title: str
    description: str
    instructions: str
    scope: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    owner: SkillOwnerRef
    groups: list[SkillGroupRef] = []
    scripts: list[SkillScriptOut] = []
    can_edit: bool = False
    can_use: bool = True  # visível ao usuário (admin vê todas, mas só usa as visíveis)


class SkillCreate(BaseModel):
    name: str = Field(min_length=2, max_length=64, pattern=NAME_PATTERN)
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10, max_length=1024)
    instructions: str = Field(min_length=10, max_length=60_000)
    scope: SkillScope = "personal"
    group_ids: list[int] = []
    is_active: bool = True
    scripts: list[SkillScriptIn] = Field(default=[], max_length=MAX_SCRIPTS)


class SkillUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=64, pattern=NAME_PATTERN)
    title: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = Field(default=None, min_length=10, max_length=1024)
    instructions: str | None = Field(default=None, min_length=10, max_length=60_000)
    scope: SkillScope | None = None
    group_ids: list[int] | None = None
    is_active: bool | None = None
    scripts: list[SkillScriptIn] | None = Field(default=None, max_length=MAX_SCRIPTS)


class ScriptApproval(BaseModel):
    approved: bool


class ScriptRunRequest(BaseModel):
    args: list[str] = Field(default=[], max_length=20)


class ScriptRunResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""
    returncode: int | None = None
    error: str | None = None
