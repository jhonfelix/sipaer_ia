from pydantic_settings import BaseSettings

# slug → Qdrant collection name
KNOWLEDGE_COLLECTIONS: dict[str, str] = {
    "relatorios_finais":  "sipaer_relatorios_finais",
    "normas_legislacoes": "sipaer_normas_legislacoes",
    "regulamentos":       "sipaer_regulamentos",
    "procedimentos":      "sipaer_procedimentos",
    "licitacoes":         "sipaer_licitacoes",
    "analise_audio":      "sipaer_analise_audio",
    "analise_spectral":   "sipaer_analise_spectral",
    "traducao_terminologia": "sipaer_traducao_terminologia",
    "outros":             "sipaer_outros",
}

# Coleção Qdrant única para arquivos de projetos (scoping por payload project_id)
PROJECT_VECTOR_COLLECTION: str = "sipaer_projetos"

KNOWLEDGE_COLLECTION_LABELS: dict[str, str] = {
    "relatorios_finais":  "Relatórios Finais",
    "normas_legislacoes": "Normas e Legislações",
    "regulamentos":       "Regulamentos",
    "procedimentos":      "Procedimentos",
    "licitacoes":         "Licitações",
    "analise_audio":      "Análise de Áudio",
    "analise_spectral":   "Análise Espectral",
    "traducao_terminologia": "Tradução — Terminologia",
    "outros":             "Outros",
}


class Settings(BaseSettings):
    CCABR_API_KEY: str = "xxx"
    CCABR_BASE_URL: str = "https://ia.ccabr.intraer"

    DATABASE_URL: str

    QDRANT_URL: str = "http://qdrant:6333"

    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_CACHE_TTL: int = 3600

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
