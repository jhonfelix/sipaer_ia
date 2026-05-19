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
  timestamp: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapUser(raw: RawUser): User {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    role: raw.role as User["role"],
    unit: raw.unit,
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
    id: raw.id,
    role: raw.role as AIMessage["role"],
    content: raw.content,
    sources: raw.sources,
    timestamp: new Date(raw.timestamp),
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

  logout(): void {
    clearToken();
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

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chat = {
  async send(payload: {
    message: string;
    report_id?: number;
    context?: string;
  }): Promise<AIMessage> {
    return mapChatMessage(
      await request<RawChatMessage>("/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );
  },

  async history(opts?: { reportId?: number; limit?: number }): Promise<AIMessage[]> {
    const params = new URLSearchParams();
    if (opts?.reportId != null) params.set("report_id", String(opts.reportId));
    if (opts?.limit != null) params.set("limit", String(opts.limit));
    const qs = params.size ? `?${params}` : "";
    return (await request<RawChatMessage[]>(`/chat/history${qs}`)).map(mapChatMessage);
  },
};
