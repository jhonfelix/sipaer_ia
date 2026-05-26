"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Pencil,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  Search,
  Calendar,
} from "lucide-react";
import { reports as reportsApi } from "@/lib/api";
import type { Report } from "@/types/report";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: {
    label: "Elaboração",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
  },
  in_review: {
    label: "Em Revisão",
    icon: AlertTriangle,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    dot: "bg-violet-500",
  },
  approved: {
    label: "Aprovado",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  published: {
    label: "Publicado",
    icon: CircleDot,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-500",
  },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    icon: CircleDot,
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-border",
    dot: "bg-muted-foreground/40",
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ progress }: { progress: Report["progress"] }) {
  const pct =
    progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
        <FileText className="w-8 h-8 text-blue-400/60" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-muted-foreground font-medium">Nenhum relatório encontrado</p>
        <p className="text-muted-foreground/60 text-sm">
          Crie o primeiro relatório de ocorrência aeronáutica.
        </p>
      </div>
      <Link
        href="/reports/new"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
      >
        <Plus className="w-4 h-4" />
        Novo Relatório
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsListPage() {
  const [reportList, setReportList] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    reportsApi
      .list()
      .then(setReportList)
      .catch(() => setReportList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reportList.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(r.id).includes(q) ||
      r.status.includes(q)
    );
  });

  return (
    <div className="flex-1 h-full overflow-auto bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gerencie e edite relatórios de ocorrências aeronáuticas
            </p>
          </div>
          <Link
            href="/reports/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Relatório
          </Link>
        </div>

        {/* ── Search ─────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID ou status..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-muted/50 transition-all"
          />
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            {/* Table head */}
            <div className="grid grid-cols-[1fr_140px_120px_140px_44px] gap-x-4 px-5 py-3 border-b border-border bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Relatório
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Progresso
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Atualizado
              </span>
              <span />
            </div>

            {/* Rows */}
            <ul className="divide-y divide-border/50">
              {filtered.map((report) => (
                <li key={report.id}>
                  <div className="grid grid-cols-[1fr_140px_120px_140px_44px] gap-x-4 items-center px-5 py-4 hover:bg-muted/20 transition-colors group">
                    {/* Title */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-400/20 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">
                            Relatório #{report.id}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-muted-foreground/50" />
                            <span className="text-muted-foreground/60 text-xs">
                              Criado em{" "}
                              {report.createdAt.toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={report.status} />
                    </div>

                    {/* Progress */}
                    <div>
                      <ProgressBar progress={report.progress} />
                    </div>

                    {/* Updated at */}
                    <div className="text-muted-foreground/60 text-xs">
                      {report.updatedAt.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>

                    {/* Action */}
                    <div>
                      <Link
                        href={`/reports/${report.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/30 hover:bg-blue-600 border border-border hover:border-blue-500 text-muted-foreground hover:text-white transition-all"
                        title="Editar relatório"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground/60">
                {filtered.length} relatório{filtered.length !== 1 ? "s" : ""}
                {search && ` encontrado${filtered.length !== 1 ? "s" : ""}`}
              </span>
              <Link
                href="/reports/new"
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Novo relatório
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
