from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReportDocument(Base):
    """Documento de apoio anexado no assistente de relatórios (/reports/new).

    É enviado antes de o relatório existir (report_id nulo) e vinculado na criação.
    O texto extraído alimenta o pré-preenchimento do RAI e a geração das seções.
    """

    __tablename__ = "report_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    report_id: Mapped[int | None] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=True, index=True
    )
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    chars: Mapped[int] = mapped_column(Integer, default=0)
    pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(MEDIUMTEXT, deferred=True)
    # indexing: pending | indexed | error (trechos no Qdrant para a geração)
    index_status: Mapped[str] = mapped_column(String(20), default="pending")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
