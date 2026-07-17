"""Agente de chat SIPAER baseado em Agno (Fase 1).

Agente único com tool calling sobre a base de conhecimento (Qdrant), usando o
endpoint OpenAI-compatible da CCABR. Coexiste com o `rag_pipeline` atual (rota
`/chat` clássica) — não substitui nada; expõe uma orquestração agêntica nova.

O modelo aponta para a CCABR em `/v1`, com `verify=False` (cert corporativo) e o
host `ia.ccabr.intraer` resolvido pelo `extra_hosts` do docker-compose — mesma
configuração de rede do `llm_service` atual.
"""
from __future__ import annotations

import httpx
from openai import AsyncOpenAI, OpenAI

from agno.agent import Agent
from agno.db.mysql import MySQLDb
from agno.models.openai import OpenAILike

from app.config import settings

# CCABR fala OpenAI-compatible em /v1 (/v1/chat/completions).
_CCABR_V1 = f"{settings.CCABR_BASE_URL.rstrip('/')}/v1"

# Modelos permitidos no chat (espelha ALLOWED_MODELS do schema de chat).
DEFAULT_MODEL = "gpt-oss-120b"

# Teto de iterações do loop de tools — o smoke test mostrou o modelo às vezes
# refinar a busca repetidamente; evita loop infinito de tool calling.
MAX_TOOL_STEPS = 6

# Quantos turns anteriores da sessão o Agno injeta no contexto (memória curta).
NUM_HISTORY_RUNS = 5

# O Agno db usa driver SYNC (pymysql); o DATABASE_URL da app é async (aiomysql).
_SYNC_DB_URL = settings.DATABASE_URL.replace("+aiomysql", "+pymysql")

# Schema onde o Agno cria suas tabelas. Sem isso ele usa o default "ai" e tenta
# criar um database novo (o usuário sipaer não tem permissão). Usamos o próprio
# banco da app, onde o sipaer já tem CREATE.
_DB_SCHEMA = settings.DATABASE_URL.rsplit("/", 1)[-1].split("?")[0]


# Modelos cacheados por id — reutiliza os pools de conexão (sync + async) em vez
# de recriar clients a cada requisição.
_MODELS: dict[str, OpenAILike] = {}


def build_model(model_id: str = DEFAULT_MODEL) -> OpenAILike:
    """Modelo OpenAI-compatible apontando para a CCABR (cert corporativo → verify=False).

    O Agno usa `client` (sync, para `run`) e `async_client` (para `arun`, usado pela
    API FastAPI). Pré-construímos ambos com um httpx próprio `verify=False`.
    """
    if model_id not in _MODELS:
        _MODELS[model_id] = OpenAILike(
            id=model_id,
            api_key=settings.CCABR_API_KEY,
            base_url=_CCABR_V1,
            client=OpenAI(
                api_key=settings.CCABR_API_KEY,
                base_url=_CCABR_V1,
                http_client=httpx.Client(verify=False, timeout=90.0),
                max_retries=4,
            ),
            async_client=AsyncOpenAI(
                api_key=settings.CCABR_API_KEY,
                base_url=_CCABR_V1,
                http_client=httpx.AsyncClient(verify=False, timeout=90.0),
                max_retries=4,
            ),
        )
    return _MODELS[model_id]


# DB do Agno (memória) — mesmo MySQL da app, em tabelas próprias para não colidir
# com as tabelas do domínio. Criado sob demanda (lazy singleton).
_db_singleton: MySQLDb | None = None


def _get_db() -> MySQLDb:
    global _db_singleton
    if _db_singleton is None:
        _db_singleton = MySQLDb(
            db_url=_SYNC_DB_URL,
            db_schema=_DB_SCHEMA,
            session_table="agno_sessions",
            memory_table="agno_memories",
        )
    return _db_singleton


def build_agent(
    model_id: str = DEFAULT_MODEL,
    instructions: str | list[str] | None = None,
    tools: list | None = None,
    tool_call_limit: int = MAX_TOOL_STEPS,
    session_id: str | None = None,
    user_id: str | None = None,
    enable_memory: bool = True,
    enable_user_memories: bool = False,
) -> Agent:
    """Monta o agente de chat.

    `tool_call_limit` limita o total de chamadas de tool por run — guard-rail
    contra o modelo ficar refinando a busca em loop (observado no smoke test).

    Memória (item 3 do plano — MySQL + Agno juntos):
    - `enable_memory` liga a memória de conversa: o Agno persiste e recarrega os
      últimos `NUM_HISTORY_RUNS` turns da sessão no mesmo MySQL (tabela
      `agno_sessions`), dando contexto multi-turno ao modelo. A tabela
      `Conversation` da app continua sendo o transcript que o frontend lê.
    - `enable_user_memories` liga a memória de longo prazo do Agno (fatos sobre o
      usuário entre sessões). Custa uma chamada de LLM extra por run, então fica
      opt-in nesta fase.
    """
    db = _get_db() if enable_memory else None
    return Agent(
        model=build_model(model_id),
        instructions=instructions,
        tools=tools or [],
        tool_call_limit=tool_call_limit,
        db=db,
        session_id=session_id,
        user_id=user_id,
        add_history_to_context=enable_memory,
        num_history_runs=NUM_HISTORY_RUNS,
        enable_user_memories=enable_user_memories,
        markdown=True,
    )
