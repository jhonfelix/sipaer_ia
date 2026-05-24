"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { auth as authApi } from "@/lib/api";
import { User2, Mail, Shield, Lock, Save, CheckCircle2, AlertCircle } from "lucide-react";

type Status = { type: "success" | "error"; message: string } | null;

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [email, setEmail]               = useState(user?.email ?? "");
  const [posto, setPosto]               = useState(user?.postoGraduacao ?? "");
  const [currentPw, setCurrentPw]       = useState("");
  const [newPw, setNewPw]               = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [saving, setSaving]             = useState(false);
  const [status, setStatus]             = useState<Status>(null);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (newPw && newPw !== confirmPw) {
      setStatus({ type: "error", message: "A nova senha e a confirmação não coincidem." });
      return;
    }
    if (newPw && newPw.length < 6) {
      setStatus({ type: "error", message: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }

    setSaving(true);
    try {
      const payload: Parameters<typeof authApi.updateProfile>[0] = {};
      if (email !== user.email) payload.email = email;
      if (posto !== (user.postoGraduacao ?? "")) payload.posto_graduacao = posto;
      if (newPw) { payload.current_password = currentPw; payload.new_password = newPw; }

      if (Object.keys(payload).length === 0) {
        setStatus({ type: "error", message: "Nenhuma alteração detectada." });
        return;
      }

      const updated = await authApi.updateProfile(payload);
      setUser(updated);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setStatus({ type: "success", message: "Perfil atualizado com sucesso." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar alterações.";
      setStatus({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">{initials}</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.unit}</p>
            <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
              {user.role}
            </span>
          </div>
        </div>

        {/* Feedback */}
        {status && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            status.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
          }`}>
            {status.type === "success"
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Dados pessoais */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User2 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Dados pessoais</h2>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nome completo
              </label>
              <input
                type="text"
                value={user.name}
                disabled
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">O nome só pode ser alterado pelo administrador.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Posto / Graduação
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={posto}
                  onChange={(e) => setPosto(e.target.value)}
                  placeholder="Ex: Tenente-Coronel, Sargento…"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </section>

          {/* E-mail */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">E-mail</h2>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Endereço de e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </section>

          {/* Senha */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Alterar senha</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Deixe em branco para manter a senha atual.</p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Senha atual
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                    confirmPw && confirmPw !== newPw ? "border-red-500" : "border-border"
                  }`}
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}
