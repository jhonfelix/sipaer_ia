import io

from app.config import KNOWLEDGE_COLLECTIONS, PROJECT_VECTOR_COLLECTION
from app.services.llm_service import llm_service
from app.services.vector_service import vector_service


def chunk_text(text: str, size: int = 400, overlap: int = 50) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + size, len(words))
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(words):
            break
        start += size - overlap
    return chunks


def extract_text_from_pdf(content: bytes) -> str:
    import pdfplumber

    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
    return "\n\n".join(parts)


def extract_text_from_docx(content: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


async def ingest_document(
    doc_id: int, title: str, source: str, text: str, collection: str
) -> None:
    """Background task: chunk → embed → upsert into the correct Qdrant collection → update MySQL."""
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.knowledge import KnowledgeDocument

    qdrant_collection = KNOWLEDGE_COLLECTIONS.get(collection, "sipaer_outros")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return

        try:
            doc.status = "indexing"
            await db.commit()

            chunks = chunk_text(text)
            count = 0

            for i, chunk in enumerate(chunks):
                try:
                    vector = await llm_service.embed(chunk)
                    if not vector:
                        continue
                    await vector_service.upsert(
                        doc_id=f"kdoc-{doc_id}-{i}",
                        vector=vector,
                        payload={
                            "text": chunk,
                            "source": source,
                            "title": title,
                            "doc_id": doc_id,
                            "chunk_index": i,
                            "collection": collection,
                            "type": "knowledge",
                        },
                        collection_name=qdrant_collection,
                    )
                    count += 1
                except Exception:
                    continue

            if count == 0:
                raise RuntimeError(
                    "Nenhum trecho pôde ser indexado. Verifique a conectividade com o CCABR."
                )

            doc.status = "indexed"
            doc.chunk_count = count
            await db.commit()

        except Exception as exc:
            doc.status = "error"
            doc.error_msg = str(exc)[:500]
            await db.commit()


async def ingest_project_document(
    doc_id: int, project_id: int, title: str, source: str, text: str
) -> None:
    """Background task: chunk → embed → upsert na coleção de projetos (payload project_id) → update MySQL."""
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.project import ProjectDocument

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ProjectDocument).where(ProjectDocument.id == doc_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            return

        try:
            doc.status = "indexing"
            await db.commit()

            chunks = chunk_text(text)
            count = 0

            for i, chunk in enumerate(chunks):
                try:
                    vector = await llm_service.embed(chunk)
                    if not vector:
                        continue
                    await vector_service.upsert(
                        doc_id=f"pdoc-{doc_id}-{i}",
                        vector=vector,
                        payload={
                            "text": chunk,
                            "source": source,
                            "title": title,
                            "doc_id": doc_id,
                            "chunk_index": i,
                            "project_id": project_id,
                            "type": "project",
                        },
                        collection_name=PROJECT_VECTOR_COLLECTION,
                    )
                    count += 1
                except Exception:
                    continue

            if count == 0:
                raise RuntimeError(
                    "Nenhum trecho pôde ser indexado. Verifique a conectividade com o CCABR."
                )

            doc.status = "indexed"
            doc.chunk_count = count
            await db.commit()

        except Exception as exc:
            doc.status = "error"
            doc.error_msg = str(exc)[:500]
            await db.commit()
