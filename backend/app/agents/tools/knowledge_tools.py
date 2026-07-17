"""Tools de busca na base de conhecimento (Qdrant) para o agente de chat.

Cada tool embrulha o mesmo pipeline do RAG atual — `embed` → `search` (Qdrant) →
`rerank` (Cohere) com o `RERANK_SCORE_THRESHOLD` — mas escopado a uma coleção. A
"inteligência de onde buscar" sai da regra estática (`CHAT_TYPE_COLLECTIONS`) e vai
para a *descrição* de cada tool: é o que o modelo lê para decidir qual chamar.

As fontes usadas são registradas num coletor por-requisição via `contextvars`, de
forma que requisições concorrentes não misturem fontes. O endpoint instala um
coletor com `new_source_collector()` antes de rodar o agente e lê o resultado com
`collected_sources()` ao final.
"""
from __future__ import annotations

import contextvars

from app.config import KNOWLEDGE_COLLECTIONS
from app.services.llm_service import llm_service
from app.services.rag_pipeline import RERANK_SCORE_THRESHOLD
from app.services.vector_service import vector_service

# Coletor de fontes da requisição atual. Guarda uma lista; as tools fazem append
# (mutação), então o valor propaga mesmo quando o Agno roda tools em subtasks
# (o contexto é copiado, mas a referência da lista é a mesma).
_sources_var: contextvars.ContextVar[list[dict] | None] = contextvars.ContextVar(
    "agent_sources", default=None
)


def new_source_collector() -> list[dict]:
    """Instala um coletor de fontes vazio para a requisição atual e o retorna."""
    collector: list[dict] = []
    _sources_var.set(collector)
    return collector


def collected_sources() -> list[dict]:
    """Fontes coletadas na requisição, deduplicadas por `source` (maior score)."""
    collector = _sources_var.get()
    if not collector:
        return []
    seen: dict[str, float] = {}
    for item in collector:
        s, score = item["source"], item["score"]
        if s and score > seen.get(s, -1):
            seen[s] = score
    return [
        {"source": s, "score": round(score, 4)}
        for s, score in sorted(seen.items(), key=lambda kv: kv[1], reverse=True)
    ]


def _record_sources(hits: list, relevant: list[dict]) -> None:
    collector = _sources_var.get()
    if collector is None:
        return
    for r in relevant:
        payload = hits[r["index"]].payload or {}
        s = payload.get("source", "")
        if s:
            collector.append({"source": s, "score": r.get("relevance_score", 0)})


async def _search_collection(query: str, slug: str, limit: int = 10, top_n: int = 5) -> str:
    """Executa embed → busca vetorial → rerank numa coleção e devolve o texto relevante."""
    col = KNOWLEDGE_COLLECTIONS.get(slug)
    if not col:
        return f"Coleção '{slug}' inexistente."

    vector = await llm_service.embed(query)
    if not vector:
        return "Falha ao gerar embedding da consulta."

    hits = await vector_service.search(vector, collection_names=[col], limit=limit)
    if not hits:
        return "Nenhum documento encontrado na base para essa consulta."

    docs = [h.payload.get("text", "") for h in hits]
    try:
        reranked = await llm_service.rerank(query, docs, top_n=top_n)
    except Exception:
        # Reranker indisponível — usa os melhores da busca vetorial como fallback.
        reranked = [{"index": i, "relevance_score": 0.0} for i in range(min(top_n, len(docs)))]

    relevant = [r for r in reranked if r.get("relevance_score", 0) >= RERANK_SCORE_THRESHOLD]
    if not relevant:
        return "Nenhum documento suficientemente relevante encontrado na base para essa consulta."

    _record_sources(hits, relevant)
    top_docs = [docs[r["index"]] for r in relevant]
    return "\n\n---\n\n".join(top_docs)


async def _search_all(query: str, limit: int = 10, top_n: int = 5) -> str:
    """Busca em todas as coleções de conhecimento (fallback quando nenhuma é clara)."""
    vector = await llm_service.embed(query)
    if not vector:
        return "Falha ao gerar embedding da consulta."
    hits = await vector_service.search(vector, collection_names=None, limit=limit)
    if not hits:
        return "Nenhum documento encontrado na base para essa consulta."
    docs = [h.payload.get("text", "") for h in hits]
    try:
        reranked = await llm_service.rerank(query, docs, top_n=top_n)
    except Exception:
        reranked = [{"index": i, "relevance_score": 0.0} for i in range(min(top_n, len(docs)))]
    relevant = [r for r in reranked if r.get("relevance_score", 0) >= RERANK_SCORE_THRESHOLD]
    if not relevant:
        return "Nenhum documento suficientemente relevante encontrado na base para essa consulta."
    _record_sources(hits, relevant)
    return "\n\n---\n\n".join(docs[r["index"]] for r in relevant)


# ── Tools expostas ao agente (o docstring é o que o modelo lê para rotear) ──────


async def buscar_relatorios_finais(query: str) -> str:
    """Busca em relatórios finais de investigação de acidentes e incidentes
    aeronáuticos do CENIPA (RFA, ROCA). Use para: casos similares, precedentes de
    ocorrências, análise de fatores contribuintes (HFACS), exemplos de causa
    provável, sequência de eventos e recomendações de segurança já emitidas."""
    return await _search_collection(query, "relatorios_finais")


async def buscar_normas(query: str) -> str:
    """Busca em normas e legislações aeronáuticas (NSCA, MCA, ICA, RBAC, CBA,
    Anexos OACI). Use quando a pergunta envolver regulamento, artigo, requisito
    legal, habilitação, certificação ou dispositivo normativo específico."""
    return await _search_collection(query, "normas_legislacoes")


async def buscar_regulamentos(query: str) -> str:
    """Busca em regulamentos técnicos e operacionais aeronáuticos. Use para
    procedimentos regulamentares, requisitos técnicos de aeronaves/operações e
    detalhamento de regras que complementam as normas."""
    return await _search_collection(query, "regulamentos")


async def buscar_procedimentos(query: str) -> str:
    """Busca em procedimentos operacionais e manuais (checklists, fluxos, rotinas
    de investigação e de operação). Use quando a pergunta for sobre 'como fazer',
    passo a passo, ou o procedimento correto para uma tarefa."""
    return await _search_collection(query, "procedimentos")


async def buscar_licitacoes(query: str) -> str:
    """Busca em documentos de licitações e contratos administrativos (Lei
    14.133/2021, editais, termos de referência, ETP, jurisprudência TCU). Use para
    questões administrativas, de contratação pública e conformidade licitatória."""
    return await _search_collection(query, "licitacoes")


async def buscar_glossario_traducao(query: str) -> str:
    """Busca na base terminológica e de fraseologia aeronáutica (glossário OACI,
    pares PT/EN/ES/FR, fraseologia ICAO/DECEA). Use para traduzir termos técnicos
    aeronáuticos com a equivalência oficial e manter consistência terminológica."""
    return await _search_collection(query, "traducao_terminologia", limit=15, top_n=8)


async def busca_geral(query: str) -> str:
    """Busca ampla em toda a base de conhecimento SIPAER, sem escopo específico.
    Use como último recurso quando não estiver claro qual base consultar, ou para
    uma varredura geral antes de refinar em uma coleção específica."""
    return await _search_all(query)


# Roteamento de tools por categoria de chat. O agente ainda decide *quais* chamar;
# aqui só limitamos o cardápio ao que faz sentido para a categoria.
_TOOLS_BY_CHAT_TYPE: dict[str, list] = {
    "general": [buscar_relatorios_finais, buscar_normas, buscar_regulamentos, buscar_procedimentos, busca_geral],
    "report": [buscar_relatorios_finais, buscar_normas, buscar_regulamentos, buscar_procedimentos],
    "juridical": [buscar_normas, buscar_regulamentos, buscar_relatorios_finais],
    "fab-docs": [buscar_normas, buscar_regulamentos, buscar_procedimentos],
    "da": [buscar_licitacoes, buscar_normas],
    "translation": [buscar_glossario_traducao, buscar_normas, buscar_relatorios_finais],
}


def get_tools(chat_type: str) -> list:
    """Retorna as tools de busca adequadas à categoria de chat."""
    return _TOOLS_BY_CHAT_TYPE.get(chat_type, _TOOLS_BY_CHAT_TYPE["general"])
