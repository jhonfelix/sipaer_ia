import io

from app.config import KNOWLEDGE_COLLECTIONS
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


def extract_text_from_excel(content: bytes) -> str:
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    parts: list[str] = []
    for sheet in wb.worksheets:
        parts.append(f"[Planilha: {sheet.title}]")
        for row in sheet.iter_rows(values_only=True):
            cells = [str(c) if c is not None else "" for c in row]
            if any(c.strip() for c in cells):
                parts.append("\t".join(cells))
    return "\n".join(parts)


def extract_text_from_csv(content: bytes) -> str:
    import csv

    text = content.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = ["\t".join(row) for row in reader if any(c.strip() for c in row)]
    return "\n".join(rows)


_EXTRACTORS: dict[str, object] = {
    "application/pdf": extract_text_from_pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": extract_text_from_docx,
    "application/msword": extract_text_from_docx,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": extract_text_from_excel,
    "application/vnd.ms-excel": extract_text_from_excel,
    "text/csv": extract_text_from_csv,
}

_MAX_CHARS_PER_FILE = 50_000


def extract_text_from_file(content: bytes, mime_type: str, filename: str) -> str:
    extractor = _EXTRACTORS.get(mime_type)
    if not extractor:
        return ""
    try:
        text = extractor(content)  # type: ignore[call-arg]
        if len(text) > _MAX_CHARS_PER_FILE:
            text = text[:_MAX_CHARS_PER_FILE] + "\n\n[... conteúdo truncado ...]"
        return text
    except Exception:
        return ""


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
