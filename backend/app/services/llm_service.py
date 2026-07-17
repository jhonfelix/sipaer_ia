import asyncio

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
                verify=False,
            )
        return self._client

    async def chat_completion(
        self,
        messages: list[dict],
        model: str = "gpt-oss-120b",
        temperature: float | None = None,
    ) -> str:
        payload: dict = {"model": model, "messages": messages}
        if temperature is not None:
            payload["temperature"] = temperature
        response = await self.client.post("/v1/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def transcribe_audio(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        language: str = "pt",
        model: str = "whisper-large-v3",
    ) -> dict:
        """Transcreve áudio via Whisper (OpenAI-compatible /v1/audio/transcriptions).

        Usa `verbose_json` para obter segmentos com timestamps. NÃO reutiliza
        `self.client` porque este tem header fixo `Content-Type: application/json`,
        o que quebraria o boundary do multipart — abre um client dedicado só com
        o Authorization.
        """
        data = {
            "model": model,
            "language": language,
            "response_format": "verbose_json",
            "timestamp_granularities[]": "segment",
        }
        # A VPN corporativa às vezes derruba o primeiro connect (client novo, não
        # fica "quente" como o self.client persistente). Retenta em ConnectError.
        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(
                    base_url=settings.CCABR_BASE_URL,
                    headers={"Authorization": f"Bearer {settings.CCABR_API_KEY}"},
                    timeout=300.0,
                    verify=False,
                ) as client:
                    response = await client.post(
                        "/v1/audio/transcriptions",
                        files={"file": (filename, file_bytes, content_type)},
                        data=data,
                    )
                response.raise_for_status()
                return response.json()
            except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
                last_exc = exc
                if attempt < 2:
                    await asyncio.sleep(0.5 * (attempt + 1))
        raise last_exc  # type: ignore[misc]

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
