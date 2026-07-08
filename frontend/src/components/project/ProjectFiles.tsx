"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { projects as projectsApi } from "@/lib/api";
import type { ProjectDocument } from "@/types/report";

interface Props {
  projectId: number;
}

const ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ doc }: { doc: ProjectDocument }) {
  if (doc.status === "indexed") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-500">
        <CheckCircle2 className="w-3 h-3" /> {doc.chunkCount} trechos
      </span>
    );
  }
  if (doc.status === "error") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-destructive" title={doc.errorMsg ?? undefined}>
        <AlertCircle className="w-3 h-3" /> Erro
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
      <Loader2 className="w-3 h-3 animate-spin" /> Indexando…
    </span>
  );
}

export function ProjectFiles({ projectId }: Props) {
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      setDocs(await projectsApi.documents(String(projectId)));
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Poll enquanto houver documentos processando
  useEffect(() => {
    const processing = docs.some((d) => d.status === "pending" || d.status === "indexing");
    if (!processing) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      await projectsApi.uploadDocuments(String(projectId), list);
      await load();
    } catch {
      setError("Falha no upload. Use PDF, DOCX ou TXT com texto extraível.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(docId: number) {
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    try {
      await projectsApi.removeDocument(String(projectId), docId);
    } catch {
      await load();
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          dragOver ? "border-blue-500/50 bg-blue-600/[0.06]" : "border-border hover:border-blue-500/40"
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-blue-400" />
          )}
        </div>
        <p className="text-sm text-foreground/80 font-medium">
          {uploading ? "Enviando…" : "Solte arquivos ou clique para enviar"}
        </p>
        <p className="text-[11px] text-muted-foreground/50">PDF · DOCX · TXT — disponíveis para todas as conversas</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) upload(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Lista de documentos */}
      <div className="space-y-1.5">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50 group"
          >
            <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-foreground/85 font-medium truncate">
                {doc.originalName ?? doc.title}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground/50">{formatSize(doc.sizeBytes)}</span>
                <StatusBadge doc={doc} />
              </div>
            </div>
            <button
              onClick={() => remove(doc.id)}
              title="Remover arquivo"
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {docs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground/40 py-6">
            Nenhum arquivo neste projeto ainda.
          </p>
        )}
      </div>
    </div>
  );
}
