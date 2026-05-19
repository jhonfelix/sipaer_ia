from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, chat, reports, upload
from app.services.llm_service import llm_service
from app.services.vector_service import vector_service
from app.services.cache_service import cache_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await vector_service.ensure_collection()
    yield
    await llm_service.close()
    await vector_service.close()
    await cache_service.close()


app = FastAPI(
    title="SIPAER AI Backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(chat.router)
app.include_router(upload.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
