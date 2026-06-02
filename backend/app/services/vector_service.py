import asyncio

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import KNOWLEDGE_COLLECTIONS, settings

VECTOR_SIZE = 2560


class VectorService:
    def __init__(self) -> None:
        self._client: AsyncQdrantClient | None = None

    @property
    def client(self) -> AsyncQdrantClient:
        if self._client is None:
            self._client = AsyncQdrantClient(url=settings.QDRANT_URL)
        return self._client

    async def ensure_collection(self, collection_name: str) -> None:
        exists = await self.client.collection_exists(collection_name)
        if not exists:
            await self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )

    async def ensure_all_collections(self) -> None:
        await asyncio.gather(
            *[self.ensure_collection(name) for name in KNOWLEDGE_COLLECTIONS.values()]
        )

    async def upsert(
        self, doc_id: str, vector: list[float], payload: dict, collection_name: str
    ) -> None:
        await self.client.upsert(
            collection_name=collection_name,
            points=[PointStruct(id=abs(hash(doc_id)) % (2**63), vector=vector, payload=payload)],
        )

    async def search(
        self,
        vector: list[float],
        collection_names: list[str] | None = None,
        limit: int = 10,
    ) -> list:
        targets = collection_names if collection_names else list(KNOWLEDGE_COLLECTIONS.values())

        async def _search_one(name: str) -> list:
            try:
                result = await self.client.query_points(
                    collection_name=name,
                    query=vector,
                    limit=limit,
                    with_payload=True,
                )
                return result.points
            except Exception:
                return []

        results = await asyncio.gather(*[_search_one(n) for n in targets])
        merged = [pt for sublist in results for pt in sublist]
        merged.sort(key=lambda p: p.score, reverse=True)
        return merged[:limit]

    async def delete_by_doc_id(self, doc_id: int, collection_name: str) -> None:
        from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

        await self.client.delete(
            collection_name=collection_name,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
                )
            ),
        )

    async def close(self) -> None:
        if self._client:
            await self._client.close()


vector_service = VectorService()
