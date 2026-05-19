"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  AudioLines,
  Building2,
  MessageSquarePlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { reports as reportsApi } from "@/lib/api";
import type { Report } from "@/types/report";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const statusLabel: Record<string, string> = {
  draft: "Elaboração",
  in_review: "Revisão",
  approved: "Aprovado",
  published: "Publicado",
};

const statusDot: Record<string, string> = {
  draft: "bg-amber-400",
  in_review: "bg-violet-400",
  approved: "bg-emerald-400",
  published: "bg-blue-400",
};

const modules = [
  {
    icon: MessageSquarePlus,
    label: "Novo bate-papo",
    description: "Converse com o assistente IA para apoio na investigação",
    href: "/chat",
    color: "#3b82f6",
  },
  {
    icon: FileText,
    label: "Gerenciar Relatórios",
    description: "Elabore e gerencie relatórios de ocorrências aeronáuticas",
    href: "/reports",
    color: "#10b981",
  },
  {
    icon: AudioLines,
    label: "Análise Pericial — LabData",
    description: "Transcrição e análise espectral de áudios aeronáuticos",
    href: "/labdata",
    color: "#8b5cf6",
  },
  {
    icon: Building2,
    label: "Gestão Administrativa",
    description: "Processos licitatórios e contratos institucionais",
    href: "/da",
    color: "#f59e0b",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [reportList, setReportList] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    reportsApi
      .list()
      .then(setReportList)
      .catch(() => setReportList([]))
      .finally(() => setLoadingReports(false));
  }, []);

  const firstName = user?.name.split(" ")[0] ?? "";

  const stats = {
    total: reportList.length,
    draft: reportList.filter((r) => r.status === "draft").length,
    inReview: reportList.filter((r) => r.status === "in_review").length,
    done: reportList.filter(
      (r) => r.status === "approved" || r.status === "published"
    ).length,
  };

  const recentReports = [...reportList]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 6);

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* ── Welcome ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Iniciar bate-papo
          </Link>
        </div>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Total de Relatórios",
              value: stats.total,
              icon: BarChart3,
              color: "text-blue-400",
              border: "border-blue-500/20",
              bg: "bg-blue-500/[0.08]",
            },
            {
              label: "Em Elaboração",
              value: stats.draft,
              icon: Clock,
              color: "text-amber-400",
              border: "border-amber-500/20",
              bg: "bg-amber-500/[0.08]",
            },
            {
              label: "Aguardando Revisão",
              value: stats.inReview,
              icon: AlertTriangle,
              color: "text-violet-400",
              border: "border-violet-500/20",
              bg: "bg-violet-500/[0.08]",
            },
            {
              label: "Concluídos",
              value: stats.done,
              icon: CheckCircle2,
              color: "text-emerald-400",
              border: "border-emerald-500/20",
              bg: "bg-emerald-500/[0.08]",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={`p-5 rounded-2xl border ${s.border} ${s.bg} space-y-3`}
              >
                <Icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <div className={`text-3xl font-bold ${s.color}`}>
                    {loadingReports ? (
                      <span className="text-xl text-white/20">—</span>
                    ) : (
                      s.value
                    )}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5 leading-snug">
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Modules + Recent ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Modules — 3 cols */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Módulos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modules.map((m) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="group flex items-start gap-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: `${m.color}18`,
                        border: `1px solid ${m.color}28`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white/90 font-medium text-sm leading-snug">
                          {m.label}
                        </p>
                        <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                      </div>
                      <p className="text-white/35 text-xs mt-1 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Reports — 2 cols */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                Relatórios Recentes
              </h2>
              <Link
                href="/reports"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Ver todos
              </Link>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden min-h-[200px] flex flex-col">
              {loadingReports ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recentReports.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6">
                  <FileText className="w-8 h-8 text-white/15" />
                  <p className="text-white/25 text-sm text-center">
                    Nenhum relatório criado
                  </p>
                  <Link
                    href="/reports"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
                  >
                    Criar primeiro relatório
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {recentReports.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/reports/${r.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            statusDot[r.status] ?? "bg-white/30"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white/75 text-xs font-medium truncate">
                            Relatório #{r.id}
                          </p>
                          <p className="text-white/25 text-xs">
                            {r.updatedAt.toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <span className="text-[10px] text-white/30 shrink-0">
                          {statusLabel[r.status] ?? r.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── AI Banner ─────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-blue-500/20 bg-gradient-to-r from-blue-950/60 via-[#0d1b2e] to-violet-950/30 p-6">
          <div className="absolute top-0 left-1/3 w-48 h-12 bg-blue-600/10 blur-[40px]" />
          <div className="relative flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  Assistente IA disponível
                </h3>
                <p className="text-white/35 text-xs mt-0.5">
                  Faça perguntas, analise ocorrências ou solicite rascunhos de
                  relatórios com apoio da IA.
                </p>
              </div>
            </div>
            <Link
              href="/chat"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shrink-0 shadow-lg shadow-blue-600/20"
            >
              Iniciar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
