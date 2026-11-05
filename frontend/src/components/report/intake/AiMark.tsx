"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import type { FieldProvenance } from "@/lib/api";

/** Selo "IA" ao lado do rótulo do campo, com a fonte e o trecho ao passar o mouse. */
export function AiMark({ p }: { p?: FieldProvenance }) {
  if (!p) return null;
  const conflict = p.conflicts.length > 0;
  return (
    <span className="relative inline-flex align-middle ml-1.5 group" tabIndex={0}>
      <span
        className={`inline-flex items-center gap-0.5 px-1 py-px rounded text-[9px] font-semibold tracking-wide border ${
          conflict
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
            : "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30"
        }`}
      >
        {conflict ? <AlertTriangle className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
        IA
      </span>
      <span className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 transition-opacity absolute left-0 top-full mt-1 z-50 w-80 rounded-xl border border-border bg-card shadow-xl p-3 text-left normal-case tracking-normal font-normal">
        <span className="block text-[11px] font-semibold text-foreground mb-1.5">
          {p.generated ? "Rascunho redigido pela IA a partir de:" : "Preenchido pela IA a partir de:"}
        </span>
        {p.sources.map((s, i) => (
          <span key={i} className="block mb-1.5 last:mb-0">
            <span className="block text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate">{s.filename}</span>
            {!!s.quote && <span className="block text-[11px] text-muted-foreground italic">“{s.quote}”</span>}
          </span>
        ))}
        {conflict && (
          <span className="block mt-2 pt-2 border-t border-border">
            <span className="block text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-1">
              Outros documentos divergem:
            </span>
            {p.conflicts.map((c, i) => (
              <span key={i} className="block text-[11px] text-muted-foreground">
                <b className="text-foreground">{Array.isArray(c.value) ? c.value.join(", ") : c.value}</b> — {c.filename}
              </span>
            ))}
          </span>
        )}
        <span className="block mt-2 text-[10px] text-muted-foreground">Confira antes de criar o relatório.</span>
      </span>
    </span>
  );
}
