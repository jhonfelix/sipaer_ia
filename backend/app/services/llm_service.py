import httpx

from app.config import settings


class LLMService:
    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.CCABR_BASE_URL,
                headers={
                    "Authorization": f"Bearer {settings.CCABR_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=60.0,
            )
        return self._client

    async def chat_completion(
        self, messages: list[dict], model: str = "gpt-oss-20b"
    ) -> str:
        response = await self.client.post(
            "/v1/chat/completions",
            json={"model": model, "messages": messages},
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def embed(self, text: str, model: str = "text-embedding") -> list[float]:
        response = await self.client.post(
            "/v1/embeddings",
            json={"model": model, "input": text},
        )
        response.raise_for_status()
        data = response.json()
        return data["data"][0]["embedding"]

    async def rerank(
        self, query: str, documents: list[str], top_n: int = 5, model: str = "reranker-model"
    ) -> list[dict]:
        """Cohere rerank format — not OpenAI."""
        response = await self.client.post(
            "/rerank",
            json={
                "model": model,
                "query": query,
                "documents": documents,
                "top_n": top_n,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()


llm_service = LLMService()
