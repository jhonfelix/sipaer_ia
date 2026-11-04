from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["investigator", "reviewer", "manager", "admin"]


class GroupRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    unit: str
    posto_graduacao: str | None
    avatar: str | None
    is_active: bool
    created_at: datetime
    groups: list[GroupRef] = []


class AdminUserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Role = "investigator"
    unit: str = Field(min_length=1, max_length=100)
    posto_graduacao: str | None = None
    is_active: bool = True
    group_ids: list[int] = []


class AdminUserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6)
    role: Role | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=100)
    posto_graduacao: str | None = None
    is_active: bool | None = None
    group_ids: list[int] | None = None


class UserRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    posto_graduacao: str | None
    is_active: bool


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime
    members: list[UserRef] = []


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    member_ids: list[int] = []


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = None
    member_ids: list[int] | None = None
