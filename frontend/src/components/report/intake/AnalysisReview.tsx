"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import type { RaiAnalysisResult, RaiSchema, RaiValue } from "@/lib/api";

function show(v: RaiValue | undefined) {
  if (v === undefined || v === "") return "—";
  return Array.isArray(v) ? v.join(", ") : v;
}

/** Painel no topo da etapa Dados: resumo do pré-preenchimento e conflitos a resolver. */
export function AnalysisReview({
  result,
  schema,
  currentValue,
  onPick,
}: {
  result: RaiAnalysisResult;
  schema: RaiSchema | null;
  currentValue: (fieldId: string) => RaiValue | undefined;
  onPick: (fieldId: string, value: RaiValue) => void;
}) {
  const labels: Record<string, string> = { "core.narrative": "Histórico" };
  for (const f of schema?.core ?? []) labels[`core.${f.id}`] = f.label;
  for (const s of schema?.sections ?? []) for (const f of s.fields) labels[f.id] = `${s.number}. ${f.label}`;

  const conflicts = Object.entries(result.provenance).filter(([, p]) => p.conflicts.length > 0);

  return (
    <div className="mb-6 rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
        <div className="text-xs text-foreground leading-relaxed">
          <b>{result.stats.filled} campo(s) pré-preenchido(s) pelos documentos.</b> Os campos marcados com{" "}
          <span className="px-1 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-semibold">IA</span>{" "}
          mostram a fonte e o trecho ao passar o mouse. O histórico é um rascunho redigido pela IA — revise.
          Tudo pode ser editado.
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 space-y-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            {conflicts.length} campo(s) com informações divergentes entre documentos
          </p>
          {conflicts.map(([id, p]) => {
            const current = currentValue(id);
            const options = [
              { value: result.values[id], filename: p.sources[0]?.filename ?? "", quote: p.sources[0]?.quote ?? "" },
              ...p.conflicts,
            ];
            return (
              <div key={id} className="text-xs">
                <p className="text-foreground font-medium mb-1">{labels[id] ?? id}</p>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((o, i) => {
                    const active = show(current) === show(o.value);
                    return (
                      <button
                        key={i}
                        type="button"
                        title={o.quote ? `“${o.quote}”` : undefined}
                        onClick={() => onPick(id, o.value)}
                        className={`px-2 py-1 rounded-lg border text-[11px] text-left ${
                          active
                            ? "border-amber-500/50 bg-amber-500/15 text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <b>{show(o.value)}</b> <span className="opacity-80">· {o.filename}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
