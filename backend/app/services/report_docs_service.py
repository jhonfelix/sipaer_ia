"""Documentos de apoio de relatórios: vínculo, indexação no Qdrant e busca para a geração."""
from __future__ import annotations

import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.config import REPORT_DOCS_COLLECTION
from app.database import AsyncSessionLocal
from app.models.report_document import ReportDocument
from app.services.ingestion_service import chunk_text
from app.services.llm_service import llm_service
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)


async def link_documents(report_id: int, user_id: int, document_ids: list[int], db: AsyncSession) -> int:
    """Vincula ao relatório os documentos enviados pelo usuário no assistente."""
    if not document_ids:
        return 0
    result = await db.execute(
        update(ReportDocument)
        .where(
            ReportDocument.id.in_(set(document_ids)),
            ReportDocument.uploaded_by == user_id,
            ReportDocument.report_id.is_(None),
        )
        .values(report_id=report_id)
    )
    await db.commit()
    return result.rowcount or 0


async def index_report_documents(report_id: int) -> int:
    """Fatia, gera embeddings e grava no Qdrant os documentos ainda não indexados."""
    async with AsyncSessionLocal() as db:
        docs = (
            await db.execute(
                select(ReportDocument)
                .options(undefer(ReportDocument.text))
                .where(ReportDocument.report_id == report_id, ReportDocument.index_status != "indexed")
            )
        ).scalars().all()
        total = 0
        for doc in docs:
            count = 0
            try:
                for i, chunk in enumerate(chunk_text(doc.text)):
                    vector = await llm_service.embed(chunk)
                    if not vector:
                        continue
                    await vector_service.upsert(
                        doc_id=f"rdoc-{doc.id}-{i}",
                        vector=vector,
                        payload={
                            "text": chunk,
                            "title": doc.filename,
                            "source": doc.filename,
                            "doc_id": doc.id,
                            "chunk_index": i,
                            "report_id": report_id,
                            "type": "report_document",
                        },
                        collection_name=REPORT_DOCS_COLLECTION,
                    )
                    count += 1
                doc.index_status = "indexed" if count else "error"
                doc.chunk_count = count
                doc.error_msg = None if count else "Nenhum trecho indexado (verifique a conexão com a CCABR)."
            except Exception as exc:
                logger.warning("Falha ao indexar documento %s do relatório %s: %s", doc.id, report_id, exc)
                doc.index_status = "error"
                doc.error_msg = str(exc)[:500]
            await db.commit()
            total += count
        return total


async def has_documents(report_id: int) -> bool:
    async with AsyncSessionLocal() as db:
        row = (
            await db.execute(select(ReportDocument.id).where(ReportDocument.report_id == report_id).limit(1))
        ).first()
        return row is not None


async def document_excerpts(report_id: int, query: str, limit: int = 4) -> list[dict]:
    """Trechos mais relevantes dos documentos do relatório para uma subseção."""
    vector = await llm_service.embed(query[:1000])
    if not vector:
        return []
    hits = await vector_service.search_report_docs(vector, report_id, limit=limit)
    return [
        {"filename": (h.payload or {}).get("title", "documento"), "text": (h.payload or {}).get("text", "")}
        for h in hits
    ]
