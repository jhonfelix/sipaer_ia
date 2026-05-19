import hashlib

import redis.asyncio as aioredis

from app.config import settings


class CacheService:
    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None

    @property
    def client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._client

    async def get(self, key: str) -> str | None:
        return await self.client.get(key)

    async def set(self, key: str, value: str, ttl: int = settings.REDIS_CACHE_TTL) -> None:
        await self.client.setex(key, ttl, value)

    async def delete(self, key: str) -> None:
        await self.client.delete(key)

    def rag_key(self, query: str) -> str:
        digest = hashlib.md5(query.encode()).hexdigest()
        return f"rag:{digest}"

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()


cache_service = CacheService()
