from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Compartilhamento de skill com grupos (scope="group").
skill_groups = Table(
    "skill_groups",
    Base.metadata,
    Column("skill_id", ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
)


class Skill(Base):
    """Skill no padrão Agent Skills (SKILL.md): nome, descrição e instruções.

    Escopo de visibilidade:
    - personal: só o autor
    - group:    autor + membros dos grupos em `skill_groups`
    - global:   todos (só admin define)
    """

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(String(1024))
    instructions: Mapped[str] = mapped_column(Text)
    scope: Mapped[str] = mapped_column(String(20), default="personal")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Carregamento explícito (selectinload) nas queries do router/serviço
    owner = relationship("User", foreign_keys=[created_by])
    groups = relationship("Group", secondary=skill_groups)
    scripts = relationship(
        "SkillScript",
        back_populates="skill",
        cascade="all, delete-orphan",
        order_by="SkillScript.filename",
    )


class SkillScript(Base):
    """Script executável de uma skill. Só roda depois de aprovado por um admin."""

    __tablename__ = "skill_scripts"
    __table_args__ = (UniqueConstraint("skill_id", "filename", name="uq_skill_script_filename"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(Text)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    skill = relationship("Skill", back_populates="scripts")
