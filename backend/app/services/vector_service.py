from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings

VECTOR_SIZE = 1536


class VectorService:
    def __init__(self) -> None:
        self._client: AsyncQdrantClient | None = None

    @property
    def client(self) -> AsyncQdrantClient:
        if self._client is None:
            self._client = AsyncQdrantClient(url=settings.QDRANT_URL)
        return self._client

    async def ensure_collection(self) -> None:
        exists = await self.client.collection_exists(settings.QDRANT_COLLECTION)
        if not exists:
            await self.client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )

    async def upsert(self, doc_id: str, vector: list[float], payload: dict) -> None:
        await self.client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=[PointStruct(id=abs(hash(doc_id)) % (2**63), vector=vector, payload=payload)],
        )

    async def search(self, vector: list[float], limit: int = 10) -> list:
        results = await self.client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=vector,
            limit=limit,
            with_payload=True,
        )
        return results

    async def close(self) -> None:
        if self._client:
            await self._client.close()


vector_service = VectorService()
