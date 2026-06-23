from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON, LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    occurrence: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    last_edited_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    generation_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    generation_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    creator = relationship("User", foreign_keys=[created_by], back_populates="reports_created")
    media_files = relationship("MediaFile", back_populates="report", cascade="all, delete-orphan")
    sections = relationship(
        "ReportSection", back_populates="report", order_by="ReportSection.order", lazy="selectin",
        cascade="all, delete-orphan"
    )


class ReportSection(Base):
    __tablename__ = "report_sections"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text, default="")
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    report = relationship("Report", back_populates="sections")
    subsections = relationship(
        "ReportSubsection", back_populates="section",
        order_by="ReportSubsection.order", lazy="selectin",
        cascade="all, delete-orphan"
    )


class ReportSubsection(Base):
    __tablename__ = "report_subsections"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    section_id: Mapped[str] = mapped_column(
        ForeignKey("report_sections.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(LONGTEXT, default="")
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    section = relationship("ReportSection", back_populates="subsections")
