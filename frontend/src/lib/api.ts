import type {
  AIMessage,
  Report,
  ReportSection,
  ReportSubsection,
  User,
} from "@/types/report";

// ── Error ─────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Token (localStorage, SSR-safe) ────────────────────────────────────────────

const TOKEN_KEY = "sipaer_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// ── Core request ──────────────────────────────────────────────────────────────
// Usa /api como base — Next.js rewrite redireciona para http://backend:8000

const BASE = "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new ApiError(res.status, body.detail ?? "Erro inesperado");
  }

  return body as T;
}

// ── Raw types (snake_case retornado pelo backend) ─────────────────────────────

interface RawUser {
  id: number;
  name: string;
  email: string;
  role: string;
  unit: string;
  posto_graduacao: string | null;
  avatar: string | null;
  created_at: string;
}

interface RawSubsection {
  id: string;
  title: string;
  order: number;
  content: string;
  is_completed: boolean;
}

interface RawSection {
  id: string;
  title: string;
  order: number;
  content: string;
  is_completed: boolean;
  subsections: RawSubsection[];
}

interface RawReport {
  id: number;
  status: string;
  version: number;
  occurrence: Record<string, unknown>;
  created_by: number;
  last_edited_by: number;
  created_at: string;
  updated_at: string;
  sections: RawSection[];
}

interface RawChatMessage {
  id: string;
  role: string;
  content: string;
  sources: string[];
  session_id?: string;
  created_at: string;
}

interface RawChatSession {
  session_id: string;
  title: string;
  preview: string;
  message_count: number;
  updated_at: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapUser(raw: RawUser): User {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    role: raw.role as User["role"],
    unit: raw.unit,
    postoGraduacao: raw.posto_graduacao ?? undefined,
    avatar: raw.avatar ?? undefined,
  };
}

function mapSubsection(raw: RawSubsection): ReportSubsection {
  return {
    id: raw.id,
    title: raw.title,
    order: raw.order,
    content: raw.content,
    isCompleted: raw.is_completed,
  };
}

function mapSection(raw: RawSection): ReportSection {
  return {
    id: raw.id,
    title: raw.title,
    order: raw.order,
    content: raw.content,
    isCompleted: raw.is_completed,
    subsections: (raw.subsections ?? []).map(mapSubsection),
  };
}

function computeProgress(sections: RawSection[]): Report["progress"] {
  const subs = sections.flatMap((s) => s.subsections ?? []);
  if (subs.length > 0) {
    return { total: subs.length, completed: subs.filter((s) => s.is_completed).length };
  }
  return { total: sections.length, completed: sections.filter((s) => s.is_completed).length };
}

function mapReport(raw: RawReport): Report {
  return {
    id: String(raw.id),
    occurrence: raw.occurrence as unknown as Report["occurrence"],
    status: raw.status as Report["status"],
    version: raw.version,
    sections: raw.sections.map(mapSection),
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
    createdBy: String(raw.created_by),
    lastEditedBy: String(raw.last_edited_by),
    progress: computeProgress(raw.sections),
  };
}

function mapChatMessage(raw: RawChatMessage): AIMessage {
  return {
    id: String(raw.id),
    role: raw.role as AIMessage["role"],
    content: raw.content,
    sources: raw.sources,
    sessionId: raw.session_id,
    timestamp: new Date(raw.created_at),
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  async login(email: string, password: string): Promise<void> {
    const data = await request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
  },

  async register(payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
    unit: string;
  }): Promise<User> {
    const raw = await request<RawUser>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ role: "investigator", ...payload }),
    });
    return mapUser(raw);
  },

  async me(): Promise<User> {
    return mapUser(await request<RawUser>("/auth/me"));
  },

  async updateProfile(payload: {
    email?: string;
    posto_graduacao?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<User> {
    return mapUser(
      await request<RawUser>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );
  },

  logout(): void {
    clearToken();
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = {
  async list(): Promise<User[]> {
    return (await request<RawUser[]>("/auth/users")).map(mapUser);
  },
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reports = {
  async list(): Promise<Report[]> {
    return (await request<RawReport[]>("/reports")).map(mapReport);
  },

  async get(id: string): Promise<Report> {
    return mapReport(await request<RawReport>(`/reports/${id}`));
  },

  async create(payload: {
    occurrence: Record<string, unknown>;
    sections?: Record<string, unknown>[];
  }): Promise<Report> {
    return mapReport(
      await request<RawReport>("/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
  },

  async update(
    id: string,
    payload: {
      status?: string;
      occurrence?: Record<string, unknown>;
      sections?: Record<string, {
        content?: string;
        is_completed?: boolean;
        subsections?: Record<string, { content?: string; is_completed?: boolean }>;
      }>;
    }
  ): Promise<Report> {
    return mapReport(
      await request<RawReport>(`/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );
  },

  async remove(id: string): Promise<void> {
    await request<void>(`/reports/${id}`, { method: "DELETE" });
  },
};

// ── Upload ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
  subfolder: "images" | "documents" | "audio";
}

export const media = {
  async upload(file: File, reportId?: string): Promise<UploadResult> {
    const token = getToken();
    const body = new FormData();
    body.append("file", file);
    if (reportId) body.append("report_id", reportId);
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.detail ?? "Erro no upload");
    return data as UploadResult;
  },

  async remove(subfolder: string, filename: string): Promise<void> {
    await request<void>(`/upload/${subfolder}/${filename}`, { method: "DELETE" });
  },
};

// ── Knowledge ─────────────────────────────────────────────────────────────────

export const COLLECTION_OPTIONS = [
  { value: "relatorios_finais",  label: "Relatórios Finais" },
  { value: "normas_legislacoes", label: "Normas e Legislações" },
  { value: "regulamentos",       label: "Regulamentos" },
  { value: "procedimentos",      label: "Procedimentos" },
  { value: "licitacoes",         label: "Licitações" },
  { value: "analise_audio",      label: "Análise de Áudio" },
  { value: "analise_spectral",   label: "Análise Espectral" },
  { value: "outros",             label: "Outros" },
] as const;

export type CollectionSlug = typeof COLLECTION_OPTIONS[number]["value"];

export const COLLECTION_LABELS: Record<string, string> = Object.fromEntries(
  COLLECTION_OPTIONS.map((o) => [o.value, o.label])
);

interface RawKnowledgeDocument {
  id: number;
  title: string;
  source: string;
  collection: string;
  status: string;
  chunk_count: number;
  original_name: string | null;
  size_bytes: number;
  error_msg: string | null;
  added_by: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  source: string;
  collection: string;
  status: "pending" | "indexing" | "indexed" | "error";
  chunkCount: number;
  originalName: string | null;
  sizeBytes: number;
  errorMsg: string | null;
  addedBy: number;
  createdAt: Date;
  updatedAt: Date;
}

function mapKnowledgeDocument(raw: RawKnowledgeDocument): KnowledgeDocument {
  return {
    id: raw.id,
    title: raw.title,
    source: raw.source,
    collection: raw.collection,
    status: raw.status as KnowledgeDocument["status"],
    chunkCount: raw.chunk_count,
    originalName: raw.original_name,
    sizeBytes: raw.size_bytes,
    errorMsg: raw.error_msg,
    addedBy: raw.added_by,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
  };
}

export const knowledge = {
  async list(): Promise<KnowledgeDocument[]> {
    return (await request<RawKnowledgeDocument[]>("/knowledge")).map(mapKnowledgeDocument);
  },

  async addText(payload: {
    title: string;
    source: string;
    collection: string;
    content: string;
  }): Promise<KnowledgeDocument> {
    return mapKnowledgeDocument(
      await request<RawKnowledgeDocument>("/knowledge/text", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title,
          source: payload.source,
          collection: payload.collection,
          content: payload.content,
        }),
      })
    );
  },

  async addFile(
    file: File,
    meta: { title: string; source: string; collection: string }
  ): Promise<KnowledgeDocument> {
    const token = getToken();
    const body = new FormData();
    body.append("file", file);
    body.append("title", meta.title);
    body.append("source", meta.source);
    body.append("collection", meta.collection);
    const res = await fetch(`${BASE}/knowledge/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) clearToken();
      throw new ApiError(res.status, data.detail ?? "Erro no upload");
    }
    return mapKnowledgeDocument(data as RawKnowledgeDocument);
  },

  async addFileBatch(
    files: File[],
    meta: { collection: string; source?: string }
  ): Promise<KnowledgeDocument[]> {
    const token = getToken();
    const body = new FormData();
    for (const f of files) body.append("files", f);
    body.append("collection", meta.collection);
    if (meta.source) body.append("source", meta.source);
    const res = await fetch(`${BASE}/knowledge/upload/batch`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) clearToken();
      throw new ApiError(res.status, data.detail ?? "Erro no upload em lote");
    }
    return (data as RawKnowledgeDocument[]).map(mapKnowledgeDocument);
  },

  async remove(id: number): Promise<void> {
    await request<void>(`/knowledge/${id}`, { method: "DELETE" });
  },
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatSession {
  sessionId: string;
  title: string;
  preview: string;
  messageCount: number;
  updatedAt: Date;
}

export const chat = {
  async send(payload: {
    message: string;
    report_id?: number;
    context?: string;
    session_id?: string;
    model?: string;
    chat_type?: "general" | "report" | "da";
    files?: File[];
  }): Promise<AIMessage> {
    const token = getToken();
    const form = new FormData();
    form.append("message", payload.message);
    if (payload.report_id != null) form.append("report_id", String(payload.report_id));
    if (payload.context) form.append("context", payload.context);
    if (payload.session_id) form.append("session_id", payload.session_id);
    if (payload.model) form.append("model", payload.model);
    if (payload.chat_type) form.append("chat_type", payload.chat_type);
    for (const f of payload.files ?? []) form.append("files", f);

    const res = await fetch(`${BASE}/chat`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.status === 401) { clearToken(); throw new ApiError(401, "Não autorizado"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.detail ?? "Erro inesperado");
    return mapChatMessage(data as RawChatMessage);
  },

  async sessions(): Promise<ChatSession[]> {
    const raw = await request<RawChatSession[]>("/chat/sessions");
    return raw.map((s) => ({
      sessionId: s.session_id,
      title: s.title,
      preview: s.preview,
      messageCount: s.message_count,
      updatedAt: new Date(s.updated_at),
    }));
  },

  async history(opts?: {
    sessionId?: string;
    reportId?: number;
    limit?: number;
  }): Promise<AIMessage[]> {
    const params = new URLSearchParams();
    if (opts?.sessionId != null) params.set("session_id", opts.sessionId);
    if (opts?.reportId != null) params.set("report_id", String(opts.reportId));
    if (opts?.limit != null) params.set("limit", String(opts.limit));
    const qs = params.size ? `?${params}` : "";
    return (await request<RawChatMessage[]>(`/chat/history${qs}`)).map(mapChatMessage);
  },
};
