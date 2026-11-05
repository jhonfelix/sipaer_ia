"""Extração de texto de documentos de apoio (.pdf, .docx, .txt, .md).

Diferente do extrator antigo (`ingestion_service.extract_text_from_docx`), lê também as
TABELAS do .docx, na ordem em que aparecem — formulários como CA, CIV, fichas de
notificação e o próprio RAI são quase todos tabelas.
"""
from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".markdown"}
MAX_BYTES = 50 * 1024 * 1024  # 50 MB por arquivo


@dataclass
class ExtractedText:
    text: str
    pages: int | None = None


class ExtractionError(ValueError):
    pass


def _pdf(content: bytes) -> ExtractedText:
    import pdfplumber

    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ""
            if text.strip():
                parts.append(f"[Página {i}]\n{text}")
    return ExtractedText("\n\n".join(parts), pages)


def _docx(content: bytes) -> ExtractedText:
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    doc = Document(io.BytesIO(content))
    parts: list[str] = []
    for child in doc.element.body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            text = Paragraph(child, doc).text.strip()
            if text:
                parts.append(text)
        elif tag == "tbl":
            rows: list[str] = []
            for row in Table(child, doc).rows:
                cells: list[str] = []
                prev = None
                for cell in row.cells:
                    if cell._tc is prev:  # células mescladas repetem o mesmo elemento
                        continue
                    prev = cell._tc
                    value = " ".join(cell.text.split())
                    if value:
                        cells.append(value)
                if cells:
                    rows.append(" | ".join(cells))
            if rows:
                parts.append("\n".join(rows))
    return ExtractedText("\n\n".join(parts))


def _plain(content: bytes) -> ExtractedText:
    for enc in ("utf-8", "latin-1"):
        try:
            return ExtractedText(content.decode(enc))
        except UnicodeDecodeError:
            continue
    return ExtractedText(content.decode("utf-8", errors="replace"))


def extract(filename: str, content: bytes) -> ExtractedText:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ExtractionError(f"Formato não suportado: {ext or 'sem extensão'}. Use PDF, DOCX, TXT ou MD.")
    if len(content) > MAX_BYTES:
        raise ExtractionError(f"\"{filename}\" excede {MAX_BYTES // (1024 * 1024)} MB.")
    try:
        if ext == ".pdf":
            result = _pdf(content)
        elif ext == ".docx":
            result = _docx(content)
        else:
            result = _plain(content)
    except Exception as exc:  # arquivo corrompido, protegido por senha etc.
        raise ExtractionError(f"Não foi possível ler \"{filename}\": arquivo inválido ou protegido.") from exc

    if not result.text.strip():
        if ext == ".pdf":
            raise ExtractionError(
                f"\"{filename}\" não tem texto selecionável (PDF digitalizado). "
                "Gere o PDF a partir do documento de texto original."
            )
        raise ExtractionError(f"\"{filename}\" não contém texto.")
    return result
