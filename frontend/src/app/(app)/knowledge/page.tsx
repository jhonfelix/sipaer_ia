"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  FileUp,
  Globe,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  COLLECTION_LABELS,
  COLLECTION_OPTIONS,
  knowledge as knowledgeApi,
} from "@/lib/api";
import type { KnowledgeDocument, WebDiscoverResult } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const COLLECTION_COLORS: Record<string, string> = {
  relatorios_finais:  "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  normas_legislacoes: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
  regulamentos:       "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  procedimentos:      "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  licitacoes:         "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  analise_audio:      "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  analise_spectral:   "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  outros:             "text-muted-foreground bg-muted/40 border-border/60",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-muted/40 transition-all";

const selectCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground text-sm focus:outline-none focus:border-blue-500/50 transition-all";

// ── Add Document Modal ────────────────────────────────────────────────────────

function AddDocumentModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (docs: KnowledgeDocument[]) => void;
}) {
  const [tab, setTab] = useState<"text" | "file" | "batch" | "web">("file");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [collection, setCollection] = useState<string>(COLLECTION_OPTIONS[0].value);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const batchRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [webUrl, setWebUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<WebDiscoverResult | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [onlySameDomain, setOnlySameDomain] = useState(false);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedChunks = wordCount ? Math.ceil(wordCount / 400) : 0;

  const visibleLinks = discoverResult
    ? discoverResult.links.filter((l) => !onlySameDomain || l.sameDomain)
    : [];

  const canSubmit =
    tab === "text"
      ? title.trim() && source.trim() && content.trim()
      : tab === "file"
      ? title.trim() && source.trim() && file !== null
      : tab === "batch"
      ? batchFiles.length > 0
      : selectedUrls.size > 0;

  function toggleUrl(url: string) {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function handleDiscover() {
    const url = webUrl.trim();
    if (!url || discovering) return;
    setDiscovering(true);
    setError("");
    setDiscoverResult(null);
    setSelectedUrls(new Set());
    try {
      const result = await knowledgeApi.discoverLinks(url);
      setDiscoverResult(result);
      setSelectedUrls(new Set([result.sourceUrl]));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao buscar links da página.");
    } finally {
      setDiscovering(false);
    }
  }

  function addBatchFiles(incoming: FileList | File[]) {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ];
    const allowedExt = [".pdf", ".docx", ".txt", ".md", ".markdown"];
    const arr = Array.from(incoming).filter((f) => {
      if (allowedTypes.includes(f.type)) return true;
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      return allowedExt.includes(ext);
    });
    setBatchFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !names.has(f.name + f.size))];
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    addBatchFiles(e.dataTransfer.files);
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (tab === "text") {
        const doc = await knowledgeApi.addText({ title, source, collection, content });
        onAdded([doc]);
      } else if (tab === "file") {
        const doc = await knowledgeApi.addFile(file!, { title, source, collection });
        onAdded([doc]);
      } else if (tab === "batch") {
        const docs = await knowledgeApi.addFileBatch(batchFiles, { collection, source: source || undefined });
        onAdded(docs);
      } else {
        const docs = await knowledgeApi.importUrls(Array.from(selectedUrls), {
          collection,
          source: source || undefined,
        });
        onAdded(docs);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao processar documento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div>
            <h2 className="font-semibold text-foreground">Adicionar à Base de Conhecimento</h2>
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

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/60">
            {(
              [
                { id: "file" as const, label: "Arquivo", Icon: FileUp },
                { id: "batch" as const, label: "Lote", Icon: Upload },
                { id: "web" as const, label: "Site", Icon: Globe },
                { id: "text" as const, label: "Texto", Icon: Type },
              ] as const
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

          {/* Collection selector — always visible */}
          <div>
            <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
              Coleção *
            </label>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className={selectCls}
            >
              {COLLECTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Single file / Text: common fields */}
          {tab !== "batch" && tab !== "web" && (
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
            </div>
          )}

          {/* Batch: optional source prefix */}
          {tab === "batch" && (
            <div>
              <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                Fonte (opcional — aplicada a todos os arquivos)
              </label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ex: CENIPA 2024 — deixe em branco para usar o nome do arquivo"
                className={inputCls}
              />
            </div>
          )}

          {/* Web: optional source prefix */}
          {tab === "web" && (
            <div>
              <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                Fonte (opcional — aplicada a todas as páginas selecionadas)
              </label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Ex: Site CENIPA — deixe em branco para usar a URL de cada página"
                className={inputCls}
              />
            </div>
          )}

          {/* Tab content */}
          {tab === "text" && (
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
          )}

          {tab === "file" && (
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
                    <p className="text-muted-foreground/40 text-xs mt-0.5">PDF · DOCX · TXT · MD · máx. 300 MB</p>
                  </div>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {tab === "batch" && (
            <div className="space-y-3">
              <label className="block text-xs text-muted-foreground/60 font-medium">
                Arquivos * ({batchFiles.length} selecionado{batchFiles.length !== 1 ? "s" : ""})
              </label>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => batchRef.current?.click()}
                className="w-full flex flex-col items-center gap-3 py-6 px-4 rounded-xl border-2 border-dashed border-border hover:border-blue-500/40 hover:bg-blue-500/[0.03] transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border group-hover:border-blue-500/30 flex items-center justify-center transition-colors">
                  <Layers className="w-4 h-4 text-muted-foreground/50 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground/70 text-sm font-medium">
                    Arraste arquivos ou clique para selecionar
                  </p>
                  <p className="text-muted-foreground/40 text-xs mt-0.5">
                    PDF · DOCX · TXT · MD · máx. 300 MB por arquivo · até 50 arquivos
                  </p>
                </div>
              </div>
              <input
                ref={batchRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addBatchFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              {/* File list */}
              {batchFiles.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {batchFiles.map((f, i) => (
                    <div
                      key={`${f.name}-${f.size}-${i}`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/60"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                      <span className="flex-1 text-xs text-foreground/80 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground/50 shrink-0">{formatBytes(f.size)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBatchFiles((prev) => prev.filter((_, j) => j !== i));
                        }}
                        className="p-0.5 rounded text-muted-foreground/40 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "web" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground/60 font-medium mb-1.5">
                  URL da página *
                </label>
                <div className="flex gap-2">
                  <input
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleDiscover();
                      }
                    }}
                    placeholder="Ex: https://www.cenipa.gov.br"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={handleDiscover}
                    disabled={!webUrl.trim() || discovering}
                    className="flex items-center gap-2 px-4 rounded-xl bg-muted/40 hover:bg-muted/60 border border-border disabled:opacity-40 disabled:cursor-not-allowed text-foreground/80 text-sm font-medium transition-all shrink-0"
                  >
                    {discovering ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Buscar links
                  </button>
                </div>
                <p className="text-muted-foreground/40 text-xs mt-1">
                  A página informada busca todos os links encontrados nela para você escolher quais indexar.
                </p>
              </div>

              {discoverResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-muted-foreground/60 font-medium">
                      {visibleLinks.length} link{visibleLinks.length !== 1 ? "s" : ""} encontrado{visibleLinks.length !== 1 ? "s" : ""}
                      {" · "}
                      {selectedUrls.size} selecionada{selectedUrls.size !== 1 ? "s" : ""}
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onlySameDomain}
                          onChange={(e) => setOnlySameDomain(e.target.checked)}
                          className="accent-blue-600"
                        />
                        Só mesmo domínio
                      </label>
                      <button
                        type="button"
                        onClick={() => setSelectedUrls(new Set(visibleLinks.map((l) => l.url)))}
                        className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        Selecionar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUrls(new Set())}
                        className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/40">
                    {/* Own page, listed first */}
                    <label className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-500/[0.04] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUrls.has(discoverResult.sourceUrl)}
                        onChange={() => toggleUrl(discoverResult.sourceUrl)}
                        className="mt-0.5 accent-blue-600 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground/90 text-xs font-medium truncate">
                          {discoverResult.title || discoverResult.sourceUrl}
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 align-middle">
                            página informada
                          </span>
                        </p>
                        <p className="text-muted-foreground/50 text-[11px] truncate mt-0.5">
                          {discoverResult.sourceUrl}
                        </p>
                      </div>
                    </label>

                    {visibleLinks.map((link) => (
                      <label
                        key={link.url}
                        className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/20 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUrls.has(link.url)}
                          onChange={() => toggleUrl(link.url)}
                          className="mt-0.5 accent-blue-600 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground/80 text-xs font-medium truncate">
                            {link.text}
                            {link.sameDomain && (
                              <span className="ml-1.5 text-[10px] text-muted-foreground/40">· mesmo domínio</span>
                            )}
                          </p>
                          <p className="text-muted-foreground/50 text-[11px] truncate mt-0.5">{link.url}</p>
                        </div>
                      </label>
                    ))}

                    {visibleLinks.length === 0 && (
                      <p className="text-muted-foreground/40 text-xs text-center py-4">
                        Nenhum link encontrado com esse filtro.
                      </p>
                    )}
                  </div>
                </div>
              )}
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
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/60">
          <p className="text-muted-foreground/40 text-xs">
            {tab === "batch" && batchFiles.length > 0
              ? `${batchFiles.length} arquivo${batchFiles.length !== 1 ? "s" : ""} · todos na coleção "${COLLECTION_LABELS[collection]}"`
              : tab === "web" && selectedUrls.size > 0
              ? `${selectedUrls.size} página${selectedUrls.size !== 1 ? "s" : ""} · todas na coleção "${COLLECTION_LABELS[collection]}"`
              : `Coleção: ${COLLECTION_LABELS[collection]}`}
          </p>
          <div className="flex gap-3">
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
              {submitting
                ? "Processando..."
                : tab === "batch"
                ? `Indexar ${batchFiles.length || ""} arquivo${batchFiles.length !== 1 ? "s" : ""}`
                : tab === "web"
                ? `Indexar ${selectedUrls.size || ""} página${selectedUrls.size !== 1 ? "s" : ""}`
                : "Indexar documento"}
            </button>
          </div>
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
  const [filterCollection, setFilterCollection] = useState<string>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
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

  useEffect(() => {
    const hasActive = docs.some((d) => d.status === "pending" || d.status === "indexing");
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

  function onDocsAdded(newDocs: KnowledgeDocument[]) {
    setDocs((prev) => [...newDocs, ...prev]);
    setShowModal(false);
  }

  const visibleDocs =
    filterCollection === "all" ? docs : docs.filter((d) => d.collection === filterCollection);

  const stats = {
    total: docs.length,
    indexed: docs.filter((d) => d.status === "indexed").length,
    processing: docs.filter((d) => d.status === "pending" || d.status === "indexing").length,
    chunks: docs.reduce((acc, d) => acc + d.chunkCount, 0),
  };

  // Per-collection counts
  const collectionCounts = COLLECTION_OPTIONS.reduce<Record<string, number>>((acc, o) => {
    acc[o.value] = docs.filter((d) => d.collection === o.value).length;
    return acc;
  }, {});

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento</h1>
            <p className="text-muted-foreground/60 text-sm mt-0.5">
              Documentos indexados no pipeline RAG · {COLLECTION_OPTIONS.length} coleções
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
            <div key={s.label} className={`p-5 rounded-2xl border ${s.border} ${s.bg} space-y-3`}>
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

        {/* Collection pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCollection("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              filterCollection === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground/60 hover:text-foreground hover:border-border/80"
            }`}
          >
            Todas ({docs.length})
          </button>
          {COLLECTION_OPTIONS.map((o) => {
            const count = collectionCounts[o.value] ?? 0;
            const active = filterCollection === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setFilterCollection(active ? "all" : o.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  active
                    ? `${COLLECTION_COLORS[o.value]} font-semibold`
                    : "border-border text-muted-foreground/60 hover:text-foreground hover:border-border/80"
                }`}
              >
                {o.label}
                <span className={`${active ? "opacity-80" : "opacity-50"}`}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Document list */}
        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[1fr_160px_160px_70px_140px_44px] gap-4 px-5 py-3 bg-muted/30 border-b border-border/60">
            {["Documento", "Fonte", "Coleção", "Trechos", "Status", ""].map((h) => (
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
          ) : visibleDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <div className="text-center">
                <p className="text-muted-foreground/60 text-sm font-medium">
                  {filterCollection === "all"
                    ? "Nenhum documento indexado"
                    : `Nenhum documento em "${COLLECTION_LABELS[filterCollection]}"`}
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
              {visibleDocs.map((doc) => {
                const s = STATUS_CONFIG[doc.status as DocStatus] ?? STATUS_CONFIG.error;
                const colColor = COLLECTION_COLORS[doc.collection] ?? COLLECTION_COLORS.outros;

                return (
                  <div
                    key={doc.id}
                    className="flex lg:grid lg:grid-cols-[1fr_160px_160px_70px_140px_44px] flex-col gap-2 lg:gap-4 px-5 py-4 items-start lg:items-center hover:bg-muted/20 transition-colors"
                  >
                    {/* Title */}
                    <div className="min-w-0 w-full">
                      <p className="text-foreground/90 text-sm font-medium truncate">{doc.title}</p>
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

                    {/* Collection badge */}
                    <span
                      className={`text-xs px-2 py-1 rounded-lg border truncate ${colColor}`}
                    >
                      {COLLECTION_LABELS[doc.collection] ?? doc.collection}
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
            Documentos indexados são automaticamente recuperados e usados como contexto pelo assistente IA.
            Organize por coleção para facilitar buscas direcionadas. O lote permite indexar até 50 arquivos de uma vez.
          </p>
        </div>
      </div>

      {showModal && (
        <AddDocumentModal onClose={() => setShowModal(false)} onAdded={onDocsAdded} />
      )}
    </div>
  );
}
