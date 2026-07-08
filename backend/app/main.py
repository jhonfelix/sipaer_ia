import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Garante que logs de nível INFO da aplicação (app.*) apareçam no stdout do container.
# Sem isto, o Python só emite WARNING+ pelo "last resort handler".
logging.basicConfig(level=logging.INFO)
logging.getLogger("app").setLevel(logging.INFO)

from app.config import settings
from app.routers import auth, chat, knowledge, projects, reports, upload
from app.services.llm_service import llm_service
from app.services.vector_service import vector_service
from app.services.cache_service import cache_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await vector_service.ensure_all_collections()
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
app.include_router(knowledge.router)
app.include_router(projects.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
