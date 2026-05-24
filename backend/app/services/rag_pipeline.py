import json

from app.services.cache_service import CacheService, cache_service
from app.services.llm_service import LLMService, llm_service
from app.services.vector_service import VectorService, vector_service

SYSTEM_PROMPT = """Você é o Assistente SIPAER, especialista em investigação de acidentes aeronáuticos.
Responda com base nas normas SIPAER (NSCA 3-13, RBAC 137, Anexo 13 ICAO) e no contexto fornecido.
Seja objetivo, técnico e preciso. Se não houver contexto suficiente, indique o que falta."""


class RAGPipeline:
    def __init__(
        self,
        llm: LLMService,
        vector: VectorService,
        cache: CacheService,
    ) -> None:
        self.llm = llm
        self.vector = vector
        self.cache = cache

    async def process(
        self, query: str, extra_context: str = "", model: str = "gpt-oss-120b"
    ) -> tuple[str, list[str]]:
        # Step 1: Check Redis cache
        cache_key = self.cache.rag_key(query)
        cached = await self.cache.get(cache_key)
        if cached:
            data = json.loads(cached)
            return data["content"], data["sources"]

        # Step 2: Embed query
        query_vector = await self.llm.embed(query)

        # Step 3: ANN search in Qdrant
        search_results = []
        if query_vector:
            search_results = await self.vector.search(query_vector, limit=10)

        # Step 4: Rerank (Cohere format)
        sources: list[str] = []
        context_text = extra_context
        if search_results:
            docs = [r.payload.get("text", "") for r in search_results]
            reranked = await self.llm.rerank(query, docs, top_n=5)
            top_indices = [r["index"] for r in reranked]
            top_docs = [docs[i] for i in top_indices]
            sources = [
                search_results[i].payload.get("source", "") for i in top_indices
            ]
            context_text = "\n\n---\n\n".join(top_docs)
            if extra_context:
                context_text = extra_context + "\n\n---\n\n" + context_text

        # Step 5: Build prompt
        system = SYSTEM_PROMPT
        if context_text:
            system += f"\n\nContexto relevante:\n{context_text}"

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": query},
        ]

        # Step 6: Generate response
        content = await self.llm.chat_completion(messages, model=model)

        # Step 8: Cache response (TTL via cache_service default)
        await self.cache.set(
            cache_key, json.dumps({"content": content, "sources": sources})
        )

        return content, sources


rag_pipeline = RAGPipeline(llm=llm_service, vector=vector_service, cache=cache_service)
