from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CCABR_API_KEY: str
    CCABR_BASE_URL: str = "https://ia.ccabr.intraer"

    DATABASE_URL: str

    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_COLLECTION: str = "sipaer_docs"

    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_CACHE_TTL: int = 3600

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
