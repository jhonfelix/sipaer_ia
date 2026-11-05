"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { FieldProvenance, RaiField, RaiListItem, RaiSection, RaiValue } from "@/lib/api";
import { AiMark } from "./AiMark";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-foreground text-sm focus:outline-none focus:border-blue-500/50 transition-all";
const labelCls = "block text-xs text-muted-foreground font-medium mb-1";

function isFilled(v: RaiValue | undefined) {
  return Array.isArray(v) ? v.length > 0 : !!v && String(v).trim() !== "";
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: RaiField;
  value: RaiValue | undefined;
  onChange: (v: RaiValue) => void;
}) {
  const str = Array.isArray(value) ? value.join(", ") : value ?? "";
  switch (field.type) {
    case "textarea":
      return (
        <textarea
          className={`${inputCls} min-h-[72px] resize-y leading-relaxed`}
          value={str}
          placeholder={field.hint}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
    case "yesno":
      return (
        <select className={inputCls} value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          {!!str && !(field.options ?? []).includes(str) && <option value={str}>{str}</option>}
        </select>
      );
    case "multi": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((o) => {
            const on = selected.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
                className={`px-2 py-1 rounded-md border text-[11px] transition-all ${
                  on
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    default:
      return (
        <input
          className={inputCls}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
          step={field.type === "number" ? "any" : undefined}
          value={str}
          placeholder={field.hint}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function wide(field: RaiField) {
  return field.type === "textarea" || field.type === "multi";
}

function ListField({
  field,
  items,
  onChange,
}: {
  field: RaiField;
  items: RaiListItem[];
  onChange: (items: RaiListItem[]) => void;
}) {
  const subs = field.fields ?? [];
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {field.label} {idx + 1}
              {typeof item.nome === "string" && item.nome ? ` — ${item.nome}` : ""}
            </span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="p-1 rounded text-muted-foreground hover:text-red-500"
              title="Remover"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subs.map((sub) => (
              <div key={sub.id} className={wide(sub) ? "sm:col-span-2" : ""}>
                <label className={labelCls}>{sub.label}</label>
                <FieldInput
                  field={sub}
                  value={item[sub.id]}
                  onChange={(v) => onChange(items.map((it, i) => (i === idx ? { ...it, [sub.id]: v } : it)))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, {}])}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-blue-500/40"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar
      </button>
    </div>
  );
}

/** Formulário das seções do RAI, desenhado a partir do esquema do backend. */
export function RaiForm({
  sections,
  values,
  lists,
  provenance,
  onValueChange,
  onListChange,
}: {
  sections: RaiSection[];
  values: Record<string, RaiValue>;
  lists: Record<string, RaiListItem[]>;
  provenance: Record<string, FieldProvenance>;
  onValueChange: (id: string, value: RaiValue) => void;
  onListChange: (id: string, items: RaiListItem[]) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => {
    // Abre as seções que a IA preencheu
    const ids = new Set<string>();
    for (const s of sections) {
      if (s.fields.some((f) => provenance[f.id])) ids.add(s.id);
    }
    return ids;
  });

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {sections.map((sec) => {
        const total = sec.fields.length;
        const filled = sec.fields.filter((f) =>
          f.type === "list" ? (lists[f.id] ?? []).length > 0 : isFilled(values[f.id])
        ).length;
        const fromAi = sec.fields.filter((f) => provenance[f.id]).length;
        const isOpen = open.has(sec.id);
        return (
          <div key={sec.id} className="rounded-xl border border-border bg-card/50">
            <button
              type="button"
              onClick={() => toggle(sec.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{sec.number}.</span>
              <span className="flex-1 text-sm font-medium text-foreground">{sec.title}</span>
              {fromAi > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                  {fromAi} IA
                </span>
              )}
              <span className={`text-[11px] tabular-nums ${filled ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {filled}/{total}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border">
                {!!sec.note && <p className="text-[11px] text-muted-foreground mt-2 mb-3">{sec.note}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {sec.fields.map((field) => (
                    <div key={field.id} className={wide(field) || field.type === "list" ? "sm:col-span-2" : ""}>
                      <label className={labelCls}>
                        {field.label}
                        <AiMark p={provenance[field.id]} />
                      </label>
                      {field.type === "list" ? (
                        <ListField
                          field={field}
                          items={lists[field.id] ?? []}
                          onChange={(items) => onListChange(field.id, items)}
                        />
                      ) : (
                        <FieldInput
                          field={field}
                          value={values[field.id]}
                          onChange={(v) => onValueChange(field.id, v)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
