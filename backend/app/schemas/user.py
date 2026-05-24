from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, model_validator


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "investigator"
    unit: str
    posto_graduacao: str | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    posto_graduacao: str | None = None
    current_password: str | None = None
    new_password: str | None = None

    @model_validator(mode="after")
    def password_pair(self) -> "UserUpdate":
        if bool(self.new_password) != bool(self.current_password):
            raise ValueError("Informe a senha atual junto com a nova senha")
        return self


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    unit: str
    posto_graduacao: str | None
    avatar: str | None
    created_at: datetime
