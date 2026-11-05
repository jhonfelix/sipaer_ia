"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCode2,
  Globe,
  Loader2,
  Lock,
  MessageSquarePlus,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  UsersRound,
  Wand2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { SKILL_SCOPE_LABELS, skills as skillsApi, skillSlug } from "@/lib/api";
import type { ScriptRunResult, Skill, SkillPayload, SkillScope } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Filter = "all" | "mine" | "shared" | "pending";
type Feedback = { type: "success" | "error"; message: string } | null;

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40";
const labelCls = "text-xs font-medium text-muted-foreground uppercase tracking-wide";

const SCOPE_STYLE: Record<SkillScope, { icon: typeof Lock; cls: string }> = {
  personal: { icon: Lock, cls: "bg-muted/50 text-muted-foreground border-border" },
  group: { icon: UsersRound, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  global: { icon: Globe, cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
};

const INSTRUCTIONS_TEMPLATE = `# Objetivo
Descreva o que a skill faz.

# Formato da resposta
- Estrutura, seções e padrões que a resposta deve seguir.

# Regras
- Restrições (ex.: linguagem impessoal, sem atribuição de culpa).
`;

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function pendingScripts(s: Skill): number {
  return s.scripts.filter((x) => !x.approved).length;
}

// ── Modal base ────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[92vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Editor de script ──────────────────────────────────────────────────────────

interface ScriptDraft {
  key: string;
  id?: number;
  filename: string;
  content: string;
  approved: boolean;
  originalContent?: string;
}

function ScriptRunner({ skillId, scriptId }: { skillId: number; scriptId: number }) {
  const [args, setArgs] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScriptRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const parsed = args.trim() ? args.trim().split(/\s+/) : [];
      setResult(await skillsApi.runScript(skillId, scriptId, parsed));
    } catch (err) {
      setError(errMsg(err, "Erro ao executar script."));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex gap-2">
        <input
          className={`${inputCls} font-mono text-xs`}
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          placeholder="Argumentos separados por espaço (ex.: 2500 32 1008)"
        />
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="flex items-center gap-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-medium shrink-0"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Testar
        </button>
      </div>
      {!!error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {!!result && (
        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-all rounded-md bg-muted/40 p-2 max-h-48 overflow-auto">
          {result.error
            ? `Erro: ${result.error}`
            : `código de saída: ${result.returncode}\n\n${result.stdout || "(sem saída)"}${result.stderr ? `\n--- stderr ---\n${result.stderr}` : ""}`}
        </pre>
      )}
    </div>
  );
}

// ── Modal: skill ──────────────────────────────────────────────────────────────

function SkillModal({
  skill,
  isAdmin,
  onClose,
  onSaved,
}: {
  skill: Skill | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (msg: string, updated?: Skill) => void;
}) {
  const editing = skill !== null;
  const [title, setTitle] = useState(skill?.title ?? "");
  const [name, setName] = useState(skill?.name ?? "");
  const [nameTouched, setNameTouched] = useState(editing);
  const [description, setDescription] = useState(skill?.description ?? "");
  const [instructions, setInstructions] = useState(skill?.instructions ?? INSTRUCTIONS_TEMPLATE);
  const [scope, setScope] = useState<SkillScope>(skill?.scope ?? "personal");
  const [groupIds, setGroupIds] = useState<Set<number>>(new Set(skill?.groups.map((g) => g.id) ?? []));
  const [isActive, setIsActive] = useState(skill?.isActive ?? true);
  const [scripts, setScripts] = useState<ScriptDraft[]>(
    skill?.scripts.map((s) => ({
      key: `s${s.id}`,
      id: s.id,
      filename: s.filename,
      content: s.content,
      approved: s.approved,
      originalContent: s.content,
    })) ?? []
  );
  const [shareGroups, setShareGroups] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    skillsApi.shareGroups().then(setShareGroups).catch(() => setShareGroups([]));
  }, []);

  function onTitle(v: string) {
    setTitle(v);
    if (!nameTouched) setName(skillSlug(v));
  }

  function updateScript(key: string, patch: Partial<ScriptDraft>) {
    setScripts((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  async function approve(script: ScriptDraft, approved: boolean) {
    if (!skill || script.id === undefined) return;
    try {
      const updated = await skillsApi.setScriptApproval(skill.id, script.id, approved);
      const fresh = updated.scripts.find((s) => s.id === script.id);
      if (fresh) updateScript(script.key, { approved: fresh.approved });
      onSaved(approved ? "Script aprovado." : "Aprovação revogada.", updated);
    } catch (err) {
      setError(errMsg(err, "Erro ao alterar aprovação."));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (scope === "group" && groupIds.size === 0) {
      setError("Selecione ao menos um grupo para compartilhar.");
      return;
    }
    const payload: SkillPayload = {
      name,
      title: title.trim(),
      description: description.trim(),
      instructions,
      scope,
      group_ids: scope === "group" ? Array.from(groupIds) : [],
      is_active: isActive,
      scripts: scripts.map((s) => ({ filename: s.filename.trim(), content: s.content })),
    };
    setSaving(true);
    try {
      if (editing) {
        await skillsApi.update(skill.id, payload);
        onSaved("Skill atualizada.");
      } else {
        await skillsApi.create(payload);
        onSaved("Skill criada.");
      }
    } catch (err) {
      setError(errMsg(err, "Erro ao salvar skill."));
    } finally {
      setSaving(false);
    }
  }

  const hasPendingAfterSave = scripts.some(
    (s) => !isAdmin && (s.id === undefined || s.content !== s.originalContent || !s.approved)
  );

  return (
    <Modal title={editing ? `Editar skill — ${skill.title}` : "Nova skill"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!!error && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>Título *</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              required
              minLength={2}
              maxLength={150}
              placeholder="Ex.: Redigir fatores contribuintes"
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Identificador (atalho no chat) *</label>
            <div className="flex items-center">
              <span className="px-2.5 py-2.5 rounded-l-lg border border-r-0 border-border bg-muted/40 text-sm text-muted-foreground">/</span>
              <input
                className={`${inputCls} rounded-l-none font-mono`}
                value={name}
                onChange={(e) => {
                  setNameTouched(true);
                  setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Minúsculas, números e hífens (sem hífen no início, no fim ou duplicado)"
                maxLength={64}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Descrição — quando usar *</label>
          <textarea
            className={`${inputCls} min-h-[64px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            maxLength={1024}
            placeholder="O que a skill faz e quando deve ser usada. No Modo Agente, o modelo decide usar a skill com base neste texto."
          />
          <p className="text-[11px] text-muted-foreground text-right">{description.length}/1024</p>
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Instruções (markdown) *</label>
          <textarea
            className={`${inputCls} min-h-[220px] resize-y font-mono text-xs leading-relaxed`}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            required
            minLength={10}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>Visibilidade</label>
            <select className={inputCls} value={scope} onChange={(e) => setScope(e.target.value as SkillScope)}>
              <option value="personal">Pessoal — só eu</option>
              <option value="group">Grupo — compartilhar com grupos</option>
              {(isAdmin || skill?.scope === "global") && <option value="global">Global — todos os usuários</option>}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Situação</label>
            <select className={inputCls} value={isActive ? "1" : "0"} onChange={(e) => setIsActive(e.target.value === "1")}>
              <option value="1">Ativa — disponível no chat</option>
              <option value="0">Inativa — oculta do chat</option>
            </select>
          </div>
        </div>

        {scope === "group" && (
          <div className="space-y-1">
            <label className={labelCls}>Grupos</label>
            {shareGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Você não participa de nenhum grupo. Peça a um administrador para incluí-lo em um grupo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {shareGroups.map((g) => {
                  const on = groupIds.has(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() =>
                        setGroupIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(g.id)) next.delete(g.id);
                          else next.add(g.id);
                          return next;
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                        on
                          ? "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Scripts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className={labelCls}>Scripts (opcional)</label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Python (.py) ou shell (.sh). Executados no Modo Agente, com até 30 s, sem acesso às credenciais do
                sistema. Só rodam após aprovação de um administrador.
              </p>
            </div>
            <button
              type="button"
              disabled={scripts.length >= 10}
              onClick={() =>
                setScripts((prev) => [
                  ...prev,
                  { key: `n${Date.now()}`, filename: "script.py", content: "import sys\n\nprint(sys.argv[1:])\n", approved: false },
                ])
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted/30 disabled:opacity-40 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Script
            </button>
          </div>

          {scripts.map((s) => {
            const changed = s.id !== undefined && s.content !== s.originalContent;
            return (
              <div key={s.key} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    className={`${inputCls} py-1.5 font-mono text-xs`}
                    value={s.filename}
                    onChange={(e) => updateScript(s.key, { filename: e.target.value })}
                    pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]*\.(py|sh)"
                    title="Ex.: calc.py ou gerar.sh"
                    required
                  />
                  {s.id === undefined || changed ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground shrink-0">
                      {isAdmin ? "será aprovado ao salvar" : "precisará de aprovação"}
                    </span>
                  ) : s.approved ? (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <ShieldCheck className="w-3 h-3" /> Aprovado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      <Clock className="w-3 h-3" /> Aguardando aprovação
                    </span>
                  )}
                  {isAdmin && s.id !== undefined && !changed && (
                    <button
                      type="button"
                      onClick={() => approve(s, !s.approved)}
                      title={s.approved ? "Revogar aprovação" : "Aprovar script"}
                      className={`p-1.5 rounded-lg hover:bg-muted/40 shrink-0 ${
                        s.approved ? "text-muted-foreground hover:text-red-500" : "text-emerald-600"
                      }`}
                    >
                      {s.approved ? <ShieldX className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setScripts((prev) => prev.filter((x) => x.key !== s.key))}
                    title="Remover script"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted/40 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  className={`${inputCls} min-h-[140px] resize-y font-mono text-xs leading-relaxed`}
                  value={s.content}
                  onChange={(e) => updateScript(s.key, { content: e.target.value })}
                  spellCheck={false}
                  required
                />
                {editing && s.id !== undefined && s.approved && !changed && (
                  <ScriptRunner skillId={skill.id} scriptId={s.id} />
                )}
              </div>
            );
          })}
          {hasPendingAfterSave && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Scripts novos ou alterados ficam aguardando aprovação de um administrador antes de poderem ser executados.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="mt-3 px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted/30">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? "Salvar" : "Criar skill"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const myId = Number(user?.id);

  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; skill: Skill | null }>({ open: false, skill: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Admin carrega todas (para moderar scripts); os filtros separam o que é visível.
      setItems(await skillsApi.list({ all: isAdmin }));
    } catch (err) {
      setFeedback({ type: "error", message: errMsg(err, "Erro ao carregar skills.") });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(message: string, updated?: Skill) {
    setFeedback({ type: "success", message });
    if (updated) {
      // Aprovação de script: mantém o modal aberto, só atualiza a lista.
      setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      return;
    }
    setModal({ open: false, skill: null });
    load();
  }

  async function remove(s: Skill) {
    if (!confirm(`Excluir a skill "${s.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await skillsApi.remove(s.id);
      setFeedback({ type: "success", message: "Skill excluída." });
      load();
    } catch (err) {
      setFeedback({ type: "error", message: errMsg(err, "Erro ao excluir skill.") });
    }
  }

  const pendingCount = items.reduce((acc, s) => acc + pendingScripts(s), 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      const mine = s.owner.id === myId;
      if (filter === "mine" && !mine) return false;
      if (filter === "shared" && mine) return false;
      if (filter === "pending" && pendingScripts(s) === 0) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.name.includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }, [items, filter, search, myId]);

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: isAdmin ? "Todas do sistema" : "Todas" },
    { id: "mine", label: "Minhas" },
    { id: "shared", label: isAdmin ? "De outros usuários" : "Compartilhadas comigo" },
    ...(isAdmin ? [{ id: "pending" as Filter, label: "Scripts pendentes", count: pendingCount }] : []),
  ];

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/chat" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Início
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Skills</h1>
            <p className="text-muted-foreground dark:text-muted-foreground/60 text-sm mt-0.5">
              Instruções reutilizáveis para o assistente. Ative no chat com o seletor ou digitando{" "}
              <code className="px-1 rounded bg-muted/50 text-xs">/identificador</code>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={load}
              title="Atualizar"
              className="p-2 rounded-xl border border-border text-muted-foreground dark:text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setModal({ open: true, skill: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Nova skill
            </button>
          </div>
        </div>

        {/* Feedback */}
        {!!feedback && (
          <div
            className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span className="flex-1">{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="inline-flex flex-wrap rounded-xl border border-border p-1 bg-muted/20">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  filter === f.id
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {f.label}
                {!!f.count && (
                  <span className="text-[10px] px-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 tabular-nums">
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar skill…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        {/* Lista */}
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center space-y-2">
            <Wand2 className="w-8 h-8 mx-auto text-muted-foreground dark:text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "Nenhuma skill ainda. Crie a primeira para padronizar tarefas recorrentes." : "Nenhuma skill encontrada."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map((s) => {
              const scope = SCOPE_STYLE[s.scope];
              const ScopeIcon = scope.icon;
              const pending = pendingScripts(s);
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border border-border bg-card p-4 flex flex-col gap-3 ${s.isActive ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{s.title}</h3>
                      <code className="text-[11px] text-blue-600 dark:text-blue-400">/{s.name}</code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.canEdit && (
                        <>
                          <button
                            onClick={() => setModal({ open: true, skill: s })}
                            title="Editar"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => remove(s)}
                            title="Excluir"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 flex-1">{s.description}</p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${scope.cls}`}>
                      <ScopeIcon className="w-3 h-3" />
                      {SKILL_SCOPE_LABELS[s.scope]}
                      {s.scope === "group" && s.groups.length > 0 && `: ${s.groups.map((g) => g.name).join(", ")}`}
                    </span>
                    {s.scripts.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                        <FileCode2 className="w-3 h-3" /> {s.scripts.length} script{s.scripts.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {pending > 0 && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> {pending} aguardando aprovação
                      </span>
                    )}
                    {!s.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">Inativa</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[11px] text-muted-foreground truncate">
                      por {s.owner.postoGraduacao ? `${s.owner.postoGraduacao} ` : ""}
                      {s.owner.name}
                    </span>
                    <button
                      onClick={() => router.push(`/chat?skill=${encodeURIComponent(s.name)}`)}
                      disabled={!s.isActive || !s.canUse}
                      title={!s.canUse ? "Skill não compartilhada com você — visível apenas para moderação" : undefined}
                      className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline shrink-0"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" /> Usar no chat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal.open && (
        <SkillModal
          skill={modal.skill}
          isAdmin={isAdmin}
          onClose={() => setModal({ open: false, skill: null })}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
