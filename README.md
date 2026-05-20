# SIPAER-IA

Sistema de gestão aeronáutica com IA, construído sobre a API interna do CCABR.
Stack: Next.js 16 · FastAPI (Python) · MySQL · Qdrant · Redis · Nginx · Docker Compose.

---

## Arquitetura

```
sipaer-ia/
├── docker-compose.yml
├── .env                        # nunca commitar
├── .env.example
├── nginx/
│   └── nginx.conf              # proxy reverso → frontend:3000
├── frontend/                   # Next.js 16 App Router, porta 3000 (interna)
│   ├── Dockerfile              # multi-stage (standalone)
│   └── src/
│       ├── app/
│       │   └── (app)/          # rotas autenticadas: reports, labdata, da
│       ├── components/
│       │   ├── report/         # editor TipTap + extensões
│       │   └── labdata/
│       ├── lib/
│       │   ├── api.ts          # cliente HTTP → /api/* (rewrite interno Next.js)
│       │   └── mocks/
│       └── types/
│           └── report.ts
├── backend/                    # FastAPI, porta 8000
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/001_initial.py
│   └── app/
│       ├── main.py
│       ├── config.py           # pydantic BaseSettings
│       ├── database.py         # SQLAlchemy async
│       ├── routers/            # auth.py, reports.py, chat.py
│       ├── services/           # auth, report, llm, vector, rag_pipeline, cache
│       ├── models/             # SQLAlchemy ORM
│       ├── schemas/            # Pydantic v2
│       └── middleware/         # auth JWT
├── mysql/init/01_schema.sql
├── qdrant/                     # volume gerenciado pelo Docker, porta 6333
└── redis/                      # volume gerenciado pelo Docker, porta 6379
└── media/                      # volume responsavel pelo armazenamento de arquivos e imagem
```

---

## Fluxo de requisição

```
Browser → Nginx :80 → Next.js :3000
                           │
                     /api/* rewrite
                           │
                     Backend :8000 (rede Docker interna)
```

Nginx expõe apenas a porta 80. O frontend e o backend comunicam-se pela rede interna Docker. O browser nunca chama o backend diretamente — todas as chamadas passam pelo Next.js via rewrite `/api/*` → `http://backend:8000/*`.

---

## API CCABR (intranet — não expor ao frontend)

```
base_url : https://ia.ccabr.intraer
api_key  : xxxx   # usar via env CCABR_API_KEY
```

| Endpoint                              | Modelo              | Uso            |
|---------------------------------------|---------------------|----------------|
| POST /v1/chat/completions             | gpt-oss:20b         | LLM principal  |
| POST /v1/embeddings                   | text-embedding      | Vetorização    |
| POST /rerank                          | bge-reranker-v2-m3  | Reranking      |

O reranker usa formato **Cohere** (não OpenAI). Implementado via `httpx` direto.
Todas as chamadas à API CCABR passam exclusivamente pelo backend Python — jamais pelo frontend.

---

## Serviços e portas

| Serviço   | Imagem/Stack              | Porta pública | Porta interna | Função                            |
|-----------|---------------------------|---------------|---------------|-----------------------------------|
| nginx     | nginx:1.27-alpine         | **80**        | 80            | Proxy reverso (entrada única)     |
| frontend  | node:20 + Next.js 16      | —             | 3000          | UI, rewrites /api/*               |
| backend   | python:3.12 + FastAPI     | 8000 (dev)    | 8000          | Proxy IA, RAG pipeline            |
| mysql     | mysql:8.0                 | 3306 (dev)    | 3306          | Conversas, usuários, metadados    |
| qdrant    | qdrant/qdrant:latest      | 6333 (dev)    | 6333          | Vetores de embedding (ANN search) |
| redis     | redis:7-alpine            | 6379 (dev)    | 6379          | Cache RAG, sessões, rate limit    |

> Em produção, remover os mapeamentos de porta do `backend`, `mysql`, `qdrant` e `redis` — acessíveis apenas via rede Docker interna.

---

## RAG Pipeline — ordem obrigatória

1. Verificar cache Redis (`rag:{hash_da_query}`)
2. Embed da query → `text-embedding` via CCABR
3. ANN search no Qdrant (coleção `sipaer_docs`, top_k=10)
4. Rerank → `bge-reranker-v2-m3` via CCABR (formato Cohere)
5. Montar prompt com contexto dos top docs
6. Gerar resposta → `gpt-oss:20b` via CCABR
7. Salvar conversa no MySQL
8. Gravar resposta no cache Redis (TTL 3600s)

---

## Convenções de código

### Python (backend)
- Python 3.12, FastAPI, SQLAlchemy async, Pydantic v2
- Funções assíncronas (`async def`) em todos os routers e services
- Variáveis de ambiente carregadas via `app/config.py` (pydantic BaseSettings)
- Sem lógica de negócio nos routers — delegar para services
- Nomes de arquivo: `snake_case.py`
- Erros: lançar `HTTPException` com mensagem clara, nunca expor stack trace
- HTTP client: sempre `httpx` async (nunca `requests` síncrono)

### TypeScript (frontend)
- Next.js 16 App Router, TypeScript strict, `output: "standalone"`
- Componentes em `PascalCase.tsx`
- Chamadas à API sempre via `src/lib/api.ts` usando base `/api` — nunca `fetch` direto nos componentes
- Autenticação: NextAuth com JWT; proteger rotas com middleware `matcher`
- Tailwind CSS para estilos — sem CSS Modules ou styled-components

### Geral
- `.env` nunca commitado; `.env.example` sempre atualizado
- Docker: cada serviço tem seu próprio `Dockerfile` (multi-stage para frontend)
- Migrations MySQL via Alembic (`alembic upgrade head`)
- Coleção Qdrant criada via `vector_service.ensure_collection()` no startup

---

## Variáveis de ambiente obrigatórias

```env
# API CCABR
CCABR_API_KEY=xxxx
CCABR_BASE_URL=https://ia.ccabr.intraer

# MySQL
MYSQL_ROOT_PASSWORD=...
MYSQL_PASSWORD=...
MYSQL_USER=sipaer
MYSQL_DATABASE=sipaer_db
DATABASE_URL=mysql+aiomysql://sipaer:${MYSQL_PASSWORD}@mysql:3306/sipaer_db

# Qdrant
QDRANT_URL=http://qdrant:6333

# Redis
REDIS_URL=redis://redis:6379/0

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
SECRET_KEY=...           # JWT backend

# Interno Docker
API_URL=http://backend:8000
```

---

## Responsabilidades por banco

| Dado                          | Onde fica  |
|-------------------------------|------------|
| Vetores de embedding          | Qdrant     |
| Metadados dos documentos      | MySQL      |
| Histórico de conversas        | MySQL      |
| Usuários e permissões         | MySQL      |
| Cache de respostas RAG        | Redis      |
| Sessões NextAuth              | Redis      |
| Rate limit por usuário        | Redis      |

---

## Comandos úteis

```bash
# Subir ambiente completo
docker-compose up -d --build

# Rodar migrations
docker-compose exec backend alembic upgrade head

# Logs em tempo real
docker-compose logs -f nginx
docker-compose logs -f backend
docker-compose logs -f frontend

# Acessar MySQL
docker-compose exec mysql mysql -u sipaer -p sipaer_db

# Verificar coleções Qdrant
curl http://localhost:6333/collections

# Swagger do backend
open http://localhost:8000/docs
```

---

## Regras repositorio de documentos

- Deve ser armazenado no pasta Media todos upload de documentos e imagens

## Regras de segurança

- A chave `CCABR_API_KEY` jamais aparece em logs, respostas de API ou no frontend
- O backend valida o JWT em todas as rotas protegidas via `middleware/auth.py`
- Rate limiting ativo via Redis: máximo 20 requisições/minuto por usuário
- CORS configurado no FastAPI para aceitar apenas `http://localhost:3000` (e domínio de produção)
- Qdrant e MySQL não expostos externamente em produção (somente via rede Docker interna)
- Nginx é o único ponto de entrada público (porta 80)

---

## O que NÃO fazer

- Não chamar `ia.ccabr.intraer` diretamente do Next.js
- Não armazenar vetores brutos no MySQL
- Não usar `requests` síncrono no backend — sempre `httpx` async
- Não expor detalhes de erro interno nas respostas HTTP (retornar 500 genérico)
- Não subir o `.env` para o repositório
- Não usar `NEXT_PUBLIC_API_URL` com URL do backend — usar rewrite interno do Next.js
