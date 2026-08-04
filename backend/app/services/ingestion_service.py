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


MAX_WEB_PAGE_SIZE = 20 * 1024 * 1024  # 20 MB
WEB_FETCH_TIMEOUT = 20.0


async def fetch_url(url: str) -> str:
    """Baixa uma página web, com limite de tamanho e restrita a conteúdo HTML."""
    import httpx

    headers = {"User-Agent": "SIPAER-IA-KnowledgeBot/1.0"}
    async with httpx.AsyncClient(
        follow_redirects=True, timeout=WEB_FETCH_TIMEOUT, headers=headers
    ) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "html" not in content_type.lower():
                raise ValueError(
                    f"Conteúdo não é HTML (content-type: {content_type or 'desconhecido'})"
                )

            chunks: list[bytes] = []
            size = 0
            async for chunk in response.aiter_bytes():
                size += len(chunk)
                if size > MAX_WEB_PAGE_SIZE:
                    raise ValueError("Página excede o limite de 20 MB.")
                chunks.append(chunk)

            raw = b"".join(chunks)
            try:
                return raw.decode(response.encoding or "utf-8", errors="ignore")
            except (LookupError, TypeError):
                return raw.decode("utf-8", errors="ignore")


def extract_text_from_html(html: str) -> tuple[str, str]:
    """Retorna (título, texto legível) de uma página HTML, descartando script/nav/menus."""
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")

    title_tag = soup.find("title")
    h1_tag = soup.find("h1")
    title = (title_tag.get_text(strip=True) if title_tag else "") or (
        h1_tag.get_text(strip=True) if h1_tag else ""
    )

    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "noscript", "svg"]):
        tag.decompose()

    raw_text = soup.get_text(separator="\n")
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    return title, "\n".join(lines)


def discover_links(html: str, base_url: str) -> list[dict]:
    """Lista os links únicos de uma página, resolvidos para URL absoluta."""
    from urllib.parse import urljoin, urlparse

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    base_host = urlparse(base_url).netloc

    seen: set[str] = set()
    links: list[dict] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue

        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme not in ("http", "https"):
            continue

        clean = parsed._replace(fragment="").geturl()
        if clean in seen:
            continue
        seen.add(clean)

        text = a.get_text(strip=True)[:150]
        links.append(
            {
                "url": clean,
                "text": text or clean,
                "same_domain": parsed.netloc == base_host,
            }
        )
        if len(links) >= 300:
            break

    return links


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


async def ingest_web_page(doc_id: int, url: str, source: str, collection: str) -> None:
    """Background task: baixa a URL, extrai o texto → chunk → embed → upsert → update MySQL.

    Ao contrário de ingest_document, o fetch/parse acontece aqui (em background) e não
    na requisição HTTP, para não travar o request quando muitas URLs são importadas de uma vez.
    """
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

            html = await fetch_url(url)
            page_title, text = extract_text_from_html(html)
            title = page_title.strip() or url

            if not text.strip():
                raise RuntimeError("Nenhum texto extraível encontrado nessa página.")

            doc.title = title
            doc.size_bytes = len(text.encode())
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
