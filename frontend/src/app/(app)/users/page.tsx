"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { admin as adminApi, ROLE_LABELS, ROLE_OPTIONS } from "@/lib/api";
import type { AdminGroup, AdminUser, AdminUserPayload, UserRole } from "@/lib/api";
import { POSTO_GROUPS, POSTO_OPTIONS, UNIT_OPTIONS } from "@/lib/military";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Tab = "users" | "groups";
type Feedback = { type: "success" | "error"; message: string } | null;

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  manager: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  reviewer: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  investigator: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40";
const labelCls = "text-xs font-medium text-muted-foreground uppercase tracking-wide";

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Modal base ────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl">
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

function CheckList<T extends { id: number }>({
  items,
  selected,
  onToggle,
  render,
  empty,
}: {
  items: T[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  render: (item: T) => React.ReactNode;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground dark:text-muted-foreground/70 py-2">{empty}</p>;
  }
  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30"
        >
          <input
            type="checkbox"
            checked={selected.has(item.id)}
            onChange={() => onToggle(item.id)}
            className="accent-blue-600"
          />
          {render(item)}
        </label>
      ))}
    </div>
  );
}

function useSelection(initial: number[]) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initial));
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { selected, toggle };
}

// ── Modal: usuário ────────────────────────────────────────────────────────────

function UserModal({
  user,
  groups,
  isSelf,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  groups: AdminGroup[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const editing = user !== null;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [posto, setPosto] = useState(user?.postoGraduacao ?? "");
  const [unit, setUnit] = useState(user?.unit ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "investigator");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [password, setPassword] = useState("");
  const { selected, toggle } = useSelection(user?.groups.map((g) => g.id) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editing && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (editing && password && password.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const payload: AdminUserPayload = {
      name: name.trim(),
      email: email.trim(),
      posto_graduacao: posto.trim(),
      unit: unit.trim(),
      role,
      is_active: isActive,
      group_ids: Array.from(selected),
    };
    if (password) payload.password = password;

    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateUser(user.id, payload);
        onSaved("Usuário atualizado com sucesso.");
      } else {
        await adminApi.createUser(payload);
        onSaved("Usuário criado com sucesso.");
      }
    } catch (err) {
      setError(errMsg(err, "Erro ao salvar usuário."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Editar usuário" : "Novo usuário"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!!error && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className={labelCls}>Nome completo *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>Posto / Graduação</label>
            <select className={inputCls} value={posto} onChange={(e) => setPosto(e.target.value)}>
              <option value="">Não informado</option>
              {POSTO_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </optgroup>
              ))}
              {!!posto && !POSTO_OPTIONS.includes(posto) && (
                <option value={posto}>{posto} (atual)</option>
              )}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Unidade *</label>
            <select className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} required>
              <option value="" disabled>Selecione…</option>
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
              {/* Preserva valor legado que não esteja na lista */}
              {!!unit && !UNIT_OPTIONS.some((u) => u.value === unit) && (
                <option value={unit}>{unit} (atual)</option>
              )}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelCls}>E-mail *</label>
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>{editing ? "Redefinir senha" : "Senha *"}</label>
          <input
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!editing}
            placeholder={editing ? "Deixe em branco para manter a atual" : "Mínimo 6 caracteres"}
            autoComplete="new-password"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelCls}>Perfil de acesso</label>
            <select
              className={inputCls}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isSelf}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Situação</label>
            <select
              className={inputCls}
              value={isActive ? "1" : "0"}
              onChange={(e) => setIsActive(e.target.value === "1")}
              disabled={isSelf}
            >
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </div>
        </div>
        {isSelf && (
          <p className="text-[11px] text-muted-foreground">
            Você não pode alterar o próprio perfil de acesso nem desativar a própria conta.
          </p>
        )}

        <div className="space-y-1">
          <label className={labelCls}>Grupos</label>
          <CheckList
            items={groups}
            selected={selected}
            onToggle={toggle}
            empty="Nenhum grupo cadastrado ainda."
            render={(g) => <span className="truncate">{g.name}</span>}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted/30">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? "Salvar" : "Criar usuário"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: grupo ──────────────────────────────────────────────────────────────

function GroupModal({
  group,
  users,
  onClose,
  onSaved,
}: {
  group: AdminGroup | null;
  users: AdminUser[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const editing = group !== null;
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [filter, setFilter] = useState("");
  const { selected, toggle } = useSelection(group?.members.map((m) => m.id) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, filter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const payload = { name: name.trim(), description: description.trim(), member_ids: Array.from(selected) };
    try {
      if (editing) {
        await adminApi.updateGroup(group.id, payload);
        onSaved("Grupo atualizado com sucesso.");
      } else {
        await adminApi.createGroup(payload);
        onSaved("Grupo criado com sucesso.");
      }
    } catch (err) {
      setError(errMsg(err, "Erro ao salvar grupo."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Editar grupo" : "Novo grupo"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!!error && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className={labelCls}>Nome do grupo *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Ex.: Comissão de Investigação 01/2026" />
        </div>

        <div className="space-y-1">
          <label className={labelCls}>Descrição</label>
          <textarea className={`${inputCls} min-h-[72px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className={labelCls}>Membros</label>
            <span className="text-[11px] text-muted-foreground">{selected.size} selecionado(s)</span>
          </div>
          <input className={`${inputCls} mb-2`} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar por nome ou e-mail…" />
          <CheckList
            items={filteredUsers}
            selected={selected}
            onToggle={toggle}
            empty="Nenhum usuário encontrado."
            render={(u) => (
              <span className="flex-1 min-w-0">
                <span className={`block truncate ${u.isActive ? "" : "text-muted-foreground line-through"}`}>
                  {u.postoGraduacao ? `${u.postoGraduacao} ` : ""}{u.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{u.email}</span>
              </span>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted/30">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? "Salvar" : "Criar grupo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";

  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [userModal, setUserModal] = useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [groupModal, setGroupModal] = useState<{ open: boolean; group: AdminGroup | null }>({ open: false, group: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, g] = await Promise.all([adminApi.listUsers(), adminApi.listGroups()]);
      setUsers(u);
      setGroups(g);
    } catch (err) {
      setFeedback({ type: "error", message: errMsg(err, "Erro ao carregar dados.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  function handleSaved(message: string) {
    setUserModal({ open: false, user: null });
    setGroupModal({ open: false, group: null });
    setFeedback({ type: "success", message });
    load();
  }

  async function toggleActive(u: AdminUser) {
    const action = u.isActive ? "desativar" : "reativar";
    if (!confirm(`Deseja ${action} o usuário "${u.name}"?`)) return;
    try {
      if (u.isActive) await adminApi.deactivateUser(u.id);
      else await adminApi.updateUser(u.id, { is_active: true });
      setFeedback({ type: "success", message: `Usuário ${u.isActive ? "desativado" : "reativado"}.` });
      load();
    } catch (err) {
      setFeedback({ type: "error", message: errMsg(err, `Erro ao ${action} usuário.`) });
    }
  }

  async function removeGroup(g: AdminGroup) {
    if (!confirm(`Excluir o grupo "${g.name}"? Os usuários não serão removidos do sistema.`)) return;
    try {
      await adminApi.deleteGroup(g.id);
      setFeedback({ type: "success", message: "Grupo excluído." });
      load();
    } catch (err) {
      setFeedback({ type: "error", message: errMsg(err, "Erro ao excluir grupo.") });
    }
  }

  const q = search.trim().toLowerCase();
  const visibleUsers = users.filter(
    (u) =>
      (showInactive || u.isActive) &&
      (!q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.unit.toLowerCase().includes(q) ||
        (u.postoGraduacao ?? "").toLowerCase().includes(q))
  );
  const visibleGroups = groups.filter(
    (g) => !q || g.name.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q)
  );

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <ShieldAlert className="w-10 h-10 mx-auto text-amber-500" />
          <h1 className="text-lg font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Apenas administradores podem gerenciar usuários e grupos.
          </p>
          <Link href="/chat" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const stats = {
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
    admins: users.filter((u) => u.isActive && u.role === "admin").length,
    groups: groups.length,
  };

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/chat" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Início
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Usuários e Grupos</h1>
            <p className="text-muted-foreground dark:text-muted-foreground/60 text-sm mt-0.5">
              Cadastro de usuários, perfis de acesso e grupos de trabalho
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
              onClick={() =>
                tab === "users"
                  ? setUserModal({ open: true, user: null })
                  : setGroupModal({ open: true, group: null })
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              {tab === "users" ? "Novo usuário" : "Novo grupo"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Usuários ativos", value: stats.active },
            { label: "Inativos", value: stats.inactive },
            { label: "Administradores", value: stats.admins },
            { label: "Grupos", value: stats.groups },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
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
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="flex-1">{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs + busca */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="inline-flex rounded-xl border border-border p-1 bg-muted/20">
            {([
              { id: "users", label: "Usuários", icon: Users, count: users.length },
              { id: "groups", label: "Grupos", icon: UsersRound, count: groups.length },
            ] as const).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    tab === t.id
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <span className="text-[11px] text-muted-foreground tabular-nums">{t.count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "users" ? "Buscar por nome, e-mail, posto ou unidade…" : "Buscar grupo…"}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          {tab === "users" && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="accent-blue-600"
              />
              Mostrar inativos
            </label>
          )}
        </div>

        {/* Conteúdo */}
        {loading && users.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "users" ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {visibleUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum usuário encontrado.</p>
            ) : (
              <div className="divide-y divide-border">
                {visibleUsers.map((u) => {
                  const isSelf = String(u.id) === me?.id;
                  return (
                    <div key={u.id} className={`flex items-center gap-4 px-4 py-3 ${u.isActive ? "" : "opacity-60"}`}>
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{initials(u.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {u.postoGraduacao ? `${u.postoGraduacao} ` : ""}{u.name}
                          </span>
                          {isSelf && <span className="text-[10px] text-muted-foreground">(você)</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ROLE_BADGE[u.role] ?? ROLE_BADGE.investigator}`}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                          {!u.isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email} · {u.unit}
                        </p>
                        {u.groups.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {u.groups.map((g) => (
                              <span key={g.id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                                {g.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setUserModal({ open: true, user: u })}
                          title="Editar"
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => toggleActive(u)}
                            title={u.isActive ? "Desativar" : "Reativar"}
                            className={`p-2 rounded-lg hover:bg-muted/40 ${
                              u.isActive ? "text-muted-foreground hover:text-red-500" : "text-muted-foreground hover:text-emerald-500"
                            }`}
                          >
                            {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <UsersRound className="w-8 h-8 mx-auto text-muted-foreground dark:text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {groups.length === 0 ? "Nenhum grupo cadastrado. Crie o primeiro grupo." : "Nenhum grupo encontrado."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleGroups.map((g) => (
              <div key={g.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{g.name}</h3>
                    {!!g.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{g.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setGroupModal({ open: true, group: g })}
                      title="Editar"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeGroup(g)}
                      title="Excluir"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {g.members.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        title={m.name}
                        className="w-7 h-7 rounded-lg bg-primary/10 border-2 border-card flex items-center justify-center"
                      >
                        <span className="text-[9px] font-bold text-primary">{initials(m.name)}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {g.members.length === 0
                      ? "Sem membros"
                      : `${g.members.length} membro${g.members.length > 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {userModal.open && (
        <UserModal
          user={userModal.user}
          groups={groups}
          isSelf={!!userModal.user && String(userModal.user.id) === me?.id}
          onClose={() => setUserModal({ open: false, user: null })}
          onSaved={handleSaved}
        />
      )}
      {groupModal.open && (
        <GroupModal
          group={groupModal.group}
          users={users}
          onClose={() => setGroupModal({ open: false, group: null })}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
