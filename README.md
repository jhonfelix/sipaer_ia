# SIPAER AI

Sistema de gestão e investigação de acidentes aeronáuticos com inteligência artificial, desenvolvido para apoiar investigadores do CENIPA/FAB seguindo os padrões SIPAER (Sistema de Investigação e Prevenção de Acidentes Aeronáuticos).

---

## Visão Geral

O SIPAER AI integra um editor de relatórios técnicos a um assistente de IA especializado em aviação aeronáutica brasileira. O sistema é composto por três interfaces de chat independentes, cada uma com prompt próprio e contexto específico, alimentadas por um pipeline RAG (Retrieval-Augmented Generation) conectado à API CCABR.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Proxy | Nginx 1.27-alpine — porta **81** (único ponto de entrada público) |
| Frontend | Next.js 16.1.2 + React 19, TypeScript strict, TailwindCSS 4, shadcn/ui, TipTap v3 |
| Backend | FastAPI Python 3.12, SQLAlchemy async, Pydantic v2, Alembic |
| Banco relacional | MySQL 8 |
| Vetores | Qdrant |
| Cache RAG | Redis 7 |
| IA | CCABR API — modelos `gpt-oss-120b` e `gemma-4-26B-A4B-it`, embeddings, reranker |
| Infra | Docker Compose |

---

## Funcionalidades

### Três Chats Independentes

| Rota | Nome | Prompt / Contexto |
|------|------|-------------------|
| `/chat` | Workspace SIPAER | Assistente geral de aviação aeronáutica (FAB, CENIPA, legislação, SMS) |
| `/reports/[id]` | Chat de Relatório | Especializado em redação e análise de RFA/ROCA — recebe seção ativa como contexto |
| `/da` | Divisão Administrativa | Especializado em licitações, contratos e documentos administrativos (Lei 14.133/2021) |

Cada chat envia `chat_type` ao backend, que seleciona o system prompt correspondente no RAG pipeline.

### Pipeline RAG
1. Embedding da query → busca semântica no Qdrant (top 10)
2. Reranking com modelo CCABR (top 5)
3. Injeção de contexto no system prompt
4. Geração de resposta via `gpt-oss-120b` ou `gemma-4-26B-A4B-it`
5. Cache de respostas no Redis por `chat_type + model + query`
6. Fontes deduplicadas antes de retornar ao frontend

### Editor de Relatórios
- Editor rich text com TipTap v3 (tabelas, links, highlight)
- Painel de IA integrado com 6 ações rápidas SIPAER (analisar situação, revisar gramática, identificar lacunas, etc.)
- Inserção direta de resposta da IA no editor
- Histórico de chat vinculado ao relatório (`report_id`)

### Base de Conhecimento
- Upload de documentos (PDF, DOCX) indexados no Qdrant
- Ingestão em background com chunking (400 palavras, overlap 50) e embedding
- Coleções separadas por categoria

### Análise de Áudio (LabData)
- Upload de áudio CVR/FDR
- Transcrição via SSE (streaming de eventos)

---

## Arquitetura

```
Browser
  │
  ▼
Nginx:81
  ├── /api/*  ──────────────────────────► FastAPI:8000
  ├── /media/ ─────────────────────────► arquivos estáticos
  └── /*  ─────────────────────────────► Next.js:3000
                                              │
                                              └── SSR / pages
```

### Estrutura de diretórios

```
sipaer_ia/
├── frontend/                   # Next.js App Router
│   └── src/
│       ├── app/(app)/
│       │   ├── chat/           # Chat geral
│       │   ├── reports/[id]/   # Editor de relatório + chat
│       │   ├── da/             # Chat administrativo
│       │   ├── labdata/        # Análise de áudio
│       │   ├── knowledge/      # Base de conhecimento
│       │   └── dashboard/
│       ├── components/
│       │   ├── chat/           # MarkdownRenderer, ModelSelector, ConversationSidebar, AttachmentPreview
│       │   ├── report/         # ReportEditor, AIAssistantPanel, ReportSidebar
│       │   └── layout/         # Header, Sidebar
│       ├── lib/
│       │   └── api.ts          # Único ponto de acesso à API do backend
│       └── types/report.ts     # Tipos de domínio
│
├── backend/                    # FastAPI
│   └── app/
│       ├── routers/            # chat, reports, auth, knowledge, upload
│       ├── services/
│       │   ├── rag_pipeline.py # RAG + system prompts por chat_type
│       │   ├── llm_service.py  # Integração CCABR API
│       │   ├── vector_service.py
│       │   ├── cache_service.py
│       │   └── ingestion_service.py
│       ├── models/             # SQLAlchemy ORM
│       ├── schemas/            # Pydantic schemas
│       └── middleware/         # Auth JWT
│
├── nginx/nginx.conf
├── docker-compose.yml
└── .env                        # Nunca commitado
```

---

## Configuração

### Pré-requisitos
- Docker Desktop
- VPN conectada à intranet (para acesso à CCABR API em `ia.ccabr.intraer`)

### Variáveis de ambiente (`.env`)

```env
# API CCABR (intranet — nunca expor ao frontend)
CCABR_API_KEY=sk-...
CCABR_BASE_URL=https://ia.ccabr.intraer

# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_PASSWORD=sipaerpassword
MYSQL_USER=sipaer
MYSQL_DATABASE=sipaer_db
DATABASE_URL=mysql+aiomysql://sipaer:sipaerpassword@mysql:3306/sipaer_db

# Qdrant
QDRANT_URL=http://qdrant:6333

# Redis
REDIS_URL=redis://redis:6379/0

# Auth
NEXTAUTH_SECRET=change_me_nextauth
NEXTAUTH_URL=http://localhost:3000
SECRET_KEY=change_me_backend_jwt_secret

# Interno Docker
API_URL=http://backend:8000
```

### Subir o ambiente

```bash
docker compose up -d
```

Acesse em: **http://localhost:81**

### Usuário padrão

| Campo | Valor |
|-------|-------|
| Email | `admin@fab.mil.br` |
| Senha | `123456` |

---

## Configuração de Rede (VPN / Intranet)

O backend precisa resolver `ia.ccabr.intraer` para acessar a CCABR API. A configuração no `docker-compose.yml` injeta o IP diretamente via `extra_hosts` e usa o DNS da VPN:

```yaml
backend:
  dns:
    - 10.52.216.201        # DNS da VPN (intraer)
  dns_search:
    - intraer
  extra_hosts:
    - "ia.ccabr.intraer:10.228.65.68"
```

O nginx roteia `/api/*` diretamente ao backend (sem passar pelo proxy do Next.js), garantindo compatibilidade com diferentes tipos de requisição.

---

## Modelos disponíveis

| Modelo | Uso recomendado |
|--------|----------------|
| `gpt-oss-120b` | Relatórios, análise técnica, documentos (padrão) |
| `gemma-4-26B-A4B-it` | Multimodal — texto e imagens |

Embedding e reranking são sempre executados pelos modelos `text-embedding` e `reranker-model` internos da CCABR API.

---

## Comandos úteis

```bash
# Subir todos os serviços
docker compose up -d

# Ver logs do backend
docker logs sipaer_ia-backend-1 -f

# Reiniciar apenas o backend (após mudanças Python)
docker compose restart backend

# Rebuildar o backend (após mudanças em requirements.txt)
docker compose build backend && docker compose up -d --no-deps backend

# Parar tudo
docker compose down
```

---

## Credenciais de desenvolvimento

> Não commitar o `.env`. As credenciais abaixo são apenas para ambiente local de desenvolvimento.

| Serviço | Usuário | Senha | Porta |
|---------|---------|-------|-------|
| MySQL | `sipaer` | `sipaerpassword` | 3306 |
| MySQL root | `root` | `rootpassword` | 3306 |
| Qdrant UI | — | — | 6333 |
| Backend Swagger | — | — | 8080 |
