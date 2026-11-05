"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, FileCode2, Settings2, Wand2, X } from "lucide-react";
import type { Skill } from "@/lib/api";

export const MAX_SELECTED_SKILLS = 3;

/** Botão da barra do chat que abre a lista de skills para ativar/desativar. */
export function SkillSelector({
  available,
  selected,
  onToggle,
}: {
  available: Skill[];
  selected: Skill[];
  onToggle: (skill: Skill) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Posição do painel (fixed, via portal): a caixa do input tem overflow-hidden e
  // cortaria um dropdown absoluto.
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);

  function place() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 320;
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      bottom: window.innerHeight - rect.top + 8,
    });
  }

  useEffect(() => {
    if (!open) return;
    place();
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const selectedIds = new Set(selected.map((s) => s.id));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Ativar skills nesta conversa (ou digite / no campo de mensagem)"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
          selected.length > 0
            ? "bg-violet-600/15 border-violet-500/30 text-violet-700 dark:text-violet-300"
            : "bg-muted/30 border-border text-muted-foreground dark:text-muted-foreground/60 hover:text-foreground"
        }`}
      >
        <Wand2 className="w-3 h-3" />
        Skills{selected.length > 0 ? ` (${selected.length})` : ""}
      </button>

      {open && !!pos && createPortal(
        <div
          ref={panelRef}
          style={{ left: pos.left, bottom: pos.bottom }}
          className="fixed w-80 rounded-xl border border-border bg-card shadow-2xl z-[100] overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium">Skills disponíveis</span>
            <span className="text-[10px] text-muted-foreground">até {MAX_SELECTED_SKILLS} por mensagem</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {available.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">Nenhuma skill disponível ainda.</p>
            ) : (
              available.map((s) => {
                const on = selectedIds.has(s.id);
                const blocked = !on && selected.length >= MAX_SELECTED_SKILLS;
                return (
                  <button
                    type="button"
                    key={s.id}
                    disabled={blocked}
                    onClick={() => onToggle(s)}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/40 disabled:opacity-40"
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        on ? "bg-violet-600 border-violet-600 text-white" : "border-border"
                      }`}
                    >
                      {on && <Check className="w-3 h-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <span className="truncate">{s.title}</span>
                        {s.scripts.length > 0 && <FileCode2 className="w-3 h-3 text-muted-foreground shrink-0" />}
                      </span>
                      <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-mono">/{s.name}</span>
                      <span className="block text-[11px] text-muted-foreground line-clamp-2">{s.description}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <Link
            href="/skills"
            className="flex items-center gap-1.5 px-3 py-2 border-t border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30"
          >
            <Settings2 className="w-3 h-3" /> Gerenciar skills
          </Link>
        </div>,
        document.body
      )}
    </div>
  );
}

/** Chips das skills ativas, exibidos acima do campo de mensagem. */
export function SelectedSkillChips({
  selected,
  agentMode,
  onRemove,
}: {
  selected: Skill[];
  agentMode: boolean;
  onRemove: (skill: Skill) => void;
}) {
  if (selected.length === 0) return null;
  const withScripts = selected.some((s) => s.scripts.length > 0);
  return (
    <div className="px-3 pt-3 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((s) => (
          <span
            key={s.id}
            className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-[11px] text-violet-700 dark:text-violet-300"
          >
            <Wand2 className="w-3 h-3" />
            {s.title}
            <button
              type="button"
              onClick={() => onRemove(s)}
              title="Desativar skill"
              className="p-0.5 rounded hover:bg-violet-500/20"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {withScripts && !agentMode && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          Esta skill tem scripts — eles só são executados com o Modo Agente ativo.
        </p>
      )}
    </div>
  );
}

/** Menu do atalho "/" — sugestões de skill enquanto o usuário digita. */
export function SlashSkillMenu({
  matches,
  activeIndex,
  onPick,
}: {
  matches: Skill[];
  activeIndex: number;
  onPick: (skill: Skill) => void;
}) {
  if (matches.length === 0) return null;
  return (
    <div className="mx-3 mt-3 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border">
        Skills — ↑↓ para navegar · Enter para ativar · Esc para fechar
      </p>
      {matches.map((s, i) => (
        <button
          type="button"
          key={s.id}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(s);
          }}
          className={`w-full flex items-baseline gap-2 px-3 py-1.5 text-left text-xs ${
            i === activeIndex ? "bg-violet-500/15" : "hover:bg-muted/40"
          }`}
        >
          <span className="font-mono text-blue-600 dark:text-blue-400 shrink-0">/{s.name}</span>
          <span className="text-muted-foreground truncate">{s.title}</span>
        </button>
      ))}
    </div>
  );
}
