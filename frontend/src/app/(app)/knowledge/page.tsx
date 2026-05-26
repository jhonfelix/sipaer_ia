"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { knowledge as knowledgeApi } from "@/lib/api";
import type { KnowledgeDocument } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS = [
  { value: "regulation", label: "Regulamento / Norma" },
  { value: "manual", label: "Manual Técnico" },
  { value: "procedure", label: "Procedimento Operacional" },
  { value: "report", label: "Relatório de Ocorrência" },
  { value: "other", label: "Outro" },
];

const DOC_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOC_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

type DocStatus = "pending" | "indexing" | "indexed" | "error";

const STATUS_CONFIG: Record<
  DocStatus,
  { label: string; color: string; bg: string; border: string; dot: string; pulse?: boolean }
> = {
  pending: {
    label: "Aguardando",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    pulse: true,
  },
  indexing: {
    label: "Indexando",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    pulse: true,
  },
  indexed: {
    label: "Indexado",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  error: {
    label: "Erro",
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-400",
  },
};

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ── Add modal ─────────────────────────────────────────────────────────────────

function AddDocumentModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (doc: KnowledgeDocument) => void;
}) {
  const [tab, setTab] = useState<"text" | "file">("text");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [docType, setDocType] = useState("regulation");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    title.trim() && source.trim() && (tab === "text" ? content.trim() : file !== null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedChunks = wordCount ? Math.ceil(wordCount / 400) : 0;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      let doc: KnowledgeDocument;
      if (tab === "text") {
        doc = await knowledgeApi.addText({ title, source, docType, content });
      } else {
        doc = await knowledgeApi.addFile(file!, { title, source, docType });
      }
      onAdded(doc);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao processar documento.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-muted/40 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div>
            <h2 className="font-semibold text-foreground">Adicionar Documento</h2>
            <p className="text-muted-foreground/50 text-xs mt-0.5">
              O conteúdo será vetorizado e indexado no pipeline RAG
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/60">
            {(
              [
                { id: "text" as const, label: "Texto Manual", Icon: Type },
                { id: "file" as const, label: "Upload de Arquivo", Icon: FileUp },
              ]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === id
                    ? "bg-background border border-border shadow-sm text-foreground"
                    : "text-muted-foreground/60 hover:text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Common fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                Título *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: NSCA 3-13 — Investigação de Acidentes Aeronáuticos"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                  Fonte *
                </label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Ex: NSCA 3-13"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                  Tipo *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                >
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tab content */}
          {tab === "text" ? (
            <div>
              <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                Conteúdo *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cole ou digite o texto a ser indexado..."
                rows={7}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground/90 placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-muted/40 transition-all resize-none"
              />
              {estimatedChunks > 0 && (
                <p className="text-muted-foreground/40 text-xs mt-1">
                  {wordCount.toLocaleString("pt-BR")} palavras · ~{estimatedChunks} trechos estimados
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                Arquivo *
              </label>
              {file ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border">
                  <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground/90 text-sm font-medium truncate">{file.name}</p>
                    <p className="text-muted-foreground/50 text-xs mt-0.5">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-1 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed border-border hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border group-hover:border-blue-500/30 flex items-center justify-center transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground/50 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground/70 text-sm font-medium">Selecionar arquivo</p>
                    <p className="text-muted-foreground/40 text-xs mt-0.5">PDF · DOCX · TXT · máx. 50 MB</p>
                  </div>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-muted-foreground/60 hover:text-foreground hover:border-border/80 text-sm font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BookOpen className="w-3.5 h-3.5" />
            )}
            {submitting ? "Processando..." : "Indexar documento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canManage = user?.role === "admin" || user?.role === "manager";

  const load = useCallback(async () => {
    try {
      const data = await knowledgeApi.list();
      setDocs(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh while any doc is pending or indexing
  useEffect(() => {
    const hasActive = docs.some(
      (d) => d.status === "pending" || d.status === "indexing"
    );
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(load, 3000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [docs, load]);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await knowledgeApi.remove(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  function onDocAdded(doc: KnowledgeDocument) {
    setDocs((prev) => [doc, ...prev]);
    setShowModal(false);
  }

  const stats = {
    total: docs.length,
    indexed: docs.filter((d) => d.status === "indexed").length,
    processing: docs.filter((d) => d.status === "pending" || d.status === "indexing").length,
    chunks: docs.reduce((acc, d) => acc + d.chunkCount, 0),
  };

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento</h1>
            <p className="text-muted-foreground/60 text-sm mt-0.5">
              Documentos e textos indexados no pipeline RAG
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={load}
              title="Atualizar lista"
              className="p-2 rounded-xl border border-border text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {canManage && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Total de Documentos",
              value: stats.total,
              color: "text-blue-600 dark:text-blue-400",
              border: "border-blue-500/20",
              bg: "bg-blue-500/[0.08]",
            },
            {
              label: "Indexados",
              value: stats.indexed,
              color: "text-emerald-600 dark:text-emerald-400",
              border: "border-emerald-500/20",
              bg: "bg-emerald-500/[0.08]",
            },
            {
              label: "Processando",
              value: stats.processing,
              color: "text-amber-600 dark:text-amber-400",
              border: "border-amber-500/20",
              bg: "bg-amber-500/[0.08]",
            },
            {
              label: "Trechos Totais",
              value: stats.chunks,
              color: "text-violet-600 dark:text-violet-400",
              border: "border-violet-500/20",
              bg: "bg-violet-500/[0.08]",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`p-5 rounded-2xl border ${s.border} ${s.bg} space-y-3`}
            >
              <div className={`text-3xl font-bold ${s.color}`}>
                {loading ? (
                  <span className="text-xl text-muted-foreground/40">—</span>
                ) : (
                  s.value.toLocaleString("pt-BR")
                )}
              </div>
              <div className="text-muted-foreground/60 text-xs leading-snug">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Document list */}
        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[1fr_160px_140px_70px_140px_44px] gap-4 px-5 py-3 bg-muted/30 border-b border-border/60">
            {["Documento", "Fonte", "Tipo", "Trechos", "Status", ""].map((h) => (
              <span
                key={h}
                className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest"
              >
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <p className="text-muted-foreground/60 text-sm font-medium">
                  Nenhum documento indexado
                </p>
                <p className="text-muted-foreground/40 text-xs mt-1">
                  {canManage
                    ? "Adicione documentos para enriquecer as respostas da IA."
                    : "Aguarde documentos serem adicionados."}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {docs.map((doc) => {
                const s =
                  STATUS_CONFIG[doc.status as DocStatus] ?? STATUS_CONFIG.error;

                return (
                  <div
                    key={doc.id}
                    className="flex lg:grid lg:grid-cols-[1fr_160px_140px_70px_140px_44px] flex-col gap-2 lg:gap-4 px-5 py-4 items-start lg:items-center hover:bg-muted/20 transition-colors"
                  >
                    {/* Title */}
                    <div className="min-w-0 w-full">
                      <p className="text-foreground/90 text-sm font-medium truncate">
                        {doc.title}
                      </p>
                      {doc.originalName && (
                        <p className="text-muted-foreground/50 text-xs truncate mt-0.5 flex items-center gap-1">
                          <FileText className="w-3 h-3 shrink-0" />
                          {doc.originalName} · {formatBytes(doc.sizeBytes)}
                        </p>
                      )}
                      {doc.errorMsg && (
                        <p className="text-red-500/70 dark:text-red-400/70 text-xs truncate mt-0.5">
                          {doc.errorMsg}
                        </p>
                      )}
                    </div>

                    {/* Source */}
                    <p className="text-muted-foreground/70 text-sm truncate">{doc.source}</p>

                    {/* Type */}
                    <span className="text-xs px-2 py-1 rounded-lg bg-muted/40 border border-border/60 text-muted-foreground/70 truncate">
                      {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    </span>

                    {/* Chunks */}
                    <span className="text-sm font-medium text-foreground/70 tabular-nums">
                      {doc.status === "indexed" ? doc.chunkCount : "—"}
                    </span>

                    {/* Status badge */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${s.bg} ${s.border} w-fit`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""} shrink-0`}
                      />
                      <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                    </div>

                    {/* Delete */}
                    {canManage ? (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        title="Remover documento e vetores"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-40"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-muted/20 border border-border/60">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-muted-foreground/60 text-xs leading-relaxed">
            Documentos indexados são automaticamente recuperados e usados como contexto pelo assistente IA
            ao responder perguntas relacionadas. Quanto mais documentos relevantes, mais precisas as respostas.
          </p>
        </div>
      </div>

      {showModal && (
        <AddDocumentModal onClose={() => setShowModal(false)} onAdded={onDocAdded} />
      )}
    </div>
  );
}
