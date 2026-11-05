"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { reportIntake } from "@/lib/api";
import type { IntakeDocument, RaiAnalysisJob, RaiAnalysisResult } from "@/lib/api";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown";
const POLL_MS = 2000;

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsStep({
  documents,
  onDocumentsChange,
  lastResult,
  onAnalyzed,
}: {
  documents: IntakeDocument[];
  onDocumentsChange: (docs: IntakeDocument[]) => void;
  lastResult: RaiAnalysisResult | null;
  onAnalyzed: (result: RaiAnalysisResult) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [job, setJob] = useState<RaiAnalysisJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [analyzedIds, setAnalyzedIds] = useState<number[]>([]);

  // Polling do progresso da análise
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const j = await reportIntake.job(jobId);
        if (cancelled) return;
        setJob(j);
        if (j.status === "done" && j.result) {
          onAnalyzed(j.result);
          setJobId(null);
          return;
        }
        if (j.status === "error") {
          setJobId(null);
          return;
        }
        timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (!cancelled) {
          setJob({ status: "error", done: 0, total: 0, current: "", result: null,
            error: err instanceof Error ? err.message : "Falha ao consultar a análise." });
          setJobId(null);
        }
      }
    };
    let timer = setTimeout(tick, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, onAnalyzed]);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    setErrors([]);
    setUploading(list.map((f) => f.name));
    const added: IntakeDocument[] = [];
    const failed: string[] = [];
    for (const file of list) {
      try {
        added.push(await reportIntake.upload(file));
      } catch (err) {
        failed.push(err instanceof Error ? err.message : `Falha ao enviar ${file.name}.`);
      } finally {
        setUploading((prev) => prev.filter((n) => n !== file.name));
      }
    }
    if (added.length) onDocumentsChange([...documents, ...added]);
    setErrors(failed);
  }

  async function remove(doc: IntakeDocument) {
    try {
      await reportIntake.remove(doc.id);
    } catch {
      /* já removido — segue */
    }
    onDocumentsChange(documents.filter((d) => d.id !== doc.id));
  }

  async function analyze() {
    setJob({ status: "running", done: 0, total: 0, current: "Enviando para análise", result: null, error: null });
    try {
      const ids = documents.map((d) => d.id);
      setJobId(await reportIntake.analyze(ids));
      setAnalyzedIds(ids);
    } catch (err) {
      setJob({ status: "error", done: 0, total: 0, current: "", result: null,
        error: err instanceof Error ? err.message : "Falha ao iniciar a análise." });
    }
  }

  const running = job?.status === "running";
  const pct = job && job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  const pendingNew = documents.some((d) => !analyzedIds.includes(d.id));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-foreground font-medium text-sm">Documentos da investigação (opcional)</p>
        <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
          Anexe notificações, depoimentos, cadernetas, certificados, laudos, METAR e outros documentos de texto.
          A IA lê cada arquivo e pré-preenche os campos do RAI na próxima etapa, indicando de qual documento e de
          qual trecho veio cada informação. Os documentos também são usados na geração do relatório.
        </p>
      </div>

      {/* Área de envio */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver ? "border-blue-500/60 bg-blue-500/[0.06]" : "border-border hover:border-blue-500/40 hover:bg-muted/20"
        }`}
      >
        <Upload className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-foreground font-medium">Arraste os arquivos ou clique para selecionar</p>
        <p className="text-xs text-muted-foreground mt-1">PDF (com texto selecionável), DOCX, TXT ou MD · até 50 MB cada</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {errors.length > 0 && (
        <div className="space-y-1.5">
          {errors.map((e, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {e}
            </p>
          ))}
        </div>
      )}

      {/* Lista */}
      {(documents.length > 0 || uploading.length > 0) && (
        <div className="rounded-xl border border-border divide-y divide-border">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{d.filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmtSize(d.sizeBytes)} · {d.chars.toLocaleString("pt-BR")} caracteres
                  {d.pages ? ` · ${d.pages} página${d.pages > 1 ? "s" : ""}` : ""}
                  {lastResult && analyzedIds.includes(d.id) && (
                    <> · {lastResult.stats.perDocument[String(d.id)] ?? 0} dado(s) extraído(s)</>
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={running}
                onClick={() => remove(d)}
                title="Remover"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted/40 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {uploading.map((name) => (
            <div key={name} className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Lendo {name}…
            </div>
          ))}
        </div>
      )}

      {/* Análise */}
      {documents.length > 0 && (
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-4 space-y-3">
          {running ? (
            <>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                Analisando documentos… {job && job.total > 0 && `${job.done} de ${job.total}`}
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{job?.current}</p>
              <p className="text-[11px] text-muted-foreground">
                Pode levar de 20 s a 1 min por documento. Você pode continuar para a próxima etapa depois que terminar.
              </p>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 text-xs text-muted-foreground">
                {lastResult && !pendingNew ? (
                  <span className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {lastResult.stats.filled} campo(s) pré-preenchido(s)
                      {lastResult.stats.conflicts > 0 && ` · ${lastResult.stats.conflicts} conflito(s) para revisar`}
                      {lastResult.stats.discarded > 0 &&
                        ` · ${lastResult.stats.discarded} valor(es) descartado(s) por falta de comprovação no texto`}
                      . Revise na próxima etapa.
                    </span>
                  </span>
                ) : lastResult && pendingNew ? (
                  "Há documentos novos. Analise de novo para incluí-los."
                ) : (
                  "Quando terminar de anexar, peça para a IA ler os documentos."
                )}
              </div>
              <button
                type="button"
                onClick={analyze}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-600/20 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                {lastResult ? "Analisar novamente" : "Analisar com IA"}
              </button>
            </div>
          )}
          {job?.status === "error" && (
            <p className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {job.error}
            </p>
          )}
          {!!lastResult && lastResult.stats.errors.length > 0 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Partes não analisadas: {lastResult.stats.errors.join("; ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
