import asyncio
import logging

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import KNOWLEDGE_COLLECTIONS, PROJECT_VECTOR_COLLECTION, settings

logger = logging.getLogger(__name__)

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
        names = list(KNOWLEDGE_COLLECTIONS.values()) + [PROJECT_VECTOR_COLLECTION]
        await asyncio.gather(*[self.ensure_collection(name) for name in names])
        # Índice de payload para permitir/otimizar o filtro por project_id na busca.
        await self.ensure_project_payload_index()

    async def ensure_project_payload_index(self) -> None:
        from qdrant_client.models import PayloadSchemaType

        try:
            await self.client.create_payload_index(
                collection_name=PROJECT_VECTOR_COLLECTION,
                field_name="project_id",
                field_schema=PayloadSchemaType.INTEGER,
            )
        except Exception:
            # Índice já existe ou coleção indisponível — não é fatal.
            logger.debug("índice de payload project_id já existe ou indisponível")

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
        query_filter=None,
    ) -> list:
        targets = collection_names if collection_names else list(KNOWLEDGE_COLLECTIONS.values())

        async def _search_one(name: str) -> list:
            try:
                result = await self.client.query_points(
                    collection_name=name,
                    query=vector,
                    limit=limit,
                    with_payload=True,
                    query_filter=query_filter,
                )
                return result.points
            except Exception:
                # Não silenciar: uma falha de busca (ex.: filtro inválido) deixaria
                # a conversa sem contexto sem nenhum indício do motivo.
                logger.exception("Falha ao buscar na coleção Qdrant '%s'", name)
                return []

        results = await asyncio.gather(*[_search_one(n) for n in targets])
        merged = [pt for sublist in results for pt in sublist]
        merged.sort(key=lambda p: p.score, reverse=True)
        return merged[:limit]

    async def search_project(self, vector: list[float], project_id: int, limit: int = 10) -> list:
        """Busca robusta na coleção de projetos, escopada por project_id.

        Tenta primeiro o filtro server-side do Qdrant. Se ele retornar vazio
        (quirks de índice/versão fazem o filtro falhar silenciosamente), refaz a
        busca sem filtro e escopa por project_id no cliente — garantindo que os
        anexos do projeto sempre sejam recuperados.
        """
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        flt = Filter(must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))])
        server_side = await self.search(
            vector, collection_names=[PROJECT_VECTOR_COLLECTION], limit=limit, query_filter=flt
        )
        if server_side:
            return server_side

        logger.warning(
            "Busca de projeto %s com filtro server-side retornou vazio — aplicando filtro client-side",
            project_id,
        )
        raw = await self.search(
            vector, collection_names=[PROJECT_VECTOR_COLLECTION], limit=max(limit * 5, 50)
        )
        scoped = [p for p in raw if p.payload and p.payload.get("project_id") == project_id]
        return scoped[:limit]

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

    async def delete_by_project_id(self, project_id: int, collection_name: str) -> None:
        from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

        await self.client.delete(
            collection_name=collection_name,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="project_id", match=MatchValue(value=project_id))]
                )
            ),
        )

    async def close(self) -> None:
        if self._client:
            await self._client.close()


vector_service = VectorService()
