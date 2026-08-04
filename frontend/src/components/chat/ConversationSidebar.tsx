"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  FileText,
  Mic,
  Activity,
  Languages,
  Building2,
  Image,
  Scale,
  Shield,
  LayoutGrid,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  LayoutDashboard,
  AudioLines,
  BookOpen,
} from "lucide-react";
import { ProjectsSection } from "@/components/project";

const MODULES = [
  { id: "chat", label: "Início", icon: LayoutDashboard, href: "/chat", exact: true },
  { id: "reports", label: "Gerenciar Relatórios", icon: FileText, href: "/reports" },
  { id: "labdata", label: "Análise Áudio & Espectro", icon: AudioLines, href: "/labdata" },
  { id: "da", label: "Gestão Administrativa", icon: Building2, href: "/da" },
  { id: "knowledge", label: "Base de Conhecimento", icon: BookOpen, href: "/knowledge" },
];

export const CATEGORIES = [
  { id: "all", label: "Todos", icon: LayoutGrid },
  { id: "translation", label: "Tradução", icon: Languages },
  { id: "images", label: "Imagens", icon: Image },
  { id: "juridical", label: "IA Jurídica", icon: Scale },
  { id: "fab-docs", label: "Documentos FAB", icon: Shield },
];

export interface Conversation {
  id: string;
  title: string;
  category: string;
  preview: string;
  updatedAt: Date;
}

function groupByDate(list: Conversation[]): Record<string, Conversation[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

  const groups: Record<string, Conversation[]> = {
    Hoje: [],
    Ontem: [],
    "Esta semana": [],
    Anteriores: [],
  };

  for (const c of list) {
    const d = new Date(c.updatedAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["Hoje"].push(c);
    else if (day >= yesterday) groups["Ontem"].push(c);
    else if (day >= weekAgo) groups["Esta semana"].push(c);
    else groups["Anteriores"].push(c);
  }
  return groups;
}

interface Props {
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ConversationSidebar({
  activeCategory,
  onCategoryChange,
  conversations,
  activeId,
  onSelect,
  onNew,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  function isModuleActive(m: (typeof MODULES)[0]) {
    if (m.exact) return pathname === m.href;
    return pathname === m.href || pathname?.startsWith(m.href + "/");
  }

  const filtered =
    activeCategory === "all"
      ? conversations
      : conversations.filter((c) => c.category === activeCategory);

  const groups = groupByDate(filtered);

  return (
    <aside
      className={`flex flex-col bg-card border-r border-border/40 transition-all duration-300 shrink-0 ${
        collapsed ? "w-[46px]" : "w-64"
      }`}
    >
      {/* New conversation */}
      <div className={`p-2.5 pt-3 ${collapsed ? "px-1.5" : ""}`}>
        <button
          onClick={onNew}
          title={collapsed ? "Nova conversa" : undefined}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600/18 hover:bg-blue-600/28 border border-blue-500/22 text-blue-600 dark:text-blue-300 font-medium text-sm transition-all ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span className="text-[13px]">Nova conversa</span>}
        </button>
      </div>

      <div className={`h-px bg-border/40 mx-3 my-1.5 ${collapsed ? "mx-1.5" : ""}`} />

      {/* Módulos */}
      <div className={`px-2 pb-0.5 ${collapsed ? "px-1.5" : ""}`}>
        {!collapsed && (
          <p className="text-muted-foreground/40 text-[9px] uppercase tracking-[0.12em] font-semibold px-1.5 mb-1.5">
            Módulos
          </p>
        )}
        <div className="space-y-0.5">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const active = isModuleActive(m);
            return (
              <Link
                key={m.id}
                href={m.href}
                title={collapsed ? m.label : undefined}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-blue-600/14 text-blue-600 dark:text-blue-300 border border-blue-500/18"
                    : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 border border-transparent"
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                {!collapsed && <span className="truncate">{m.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="h-px bg-border/40 mx-3 mb-1" />

          {/* Categories */}
          <div className="px-2 pt-1 pb-0.5">
            <p className="text-muted-foreground/40 text-[9px] uppercase tracking-[0.12em] font-semibold px-1.5 mb-1.5">
              Categoria
            </p>
            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onCategoryChange(cat.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                      active
                        ? "bg-blue-600/14 text-blue-600 dark:text-blue-300 border border-blue-500/18"
                        : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 border border-transparent"
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border/40 mx-3 my-1.5" />

          {/* Projetos */}
          <ProjectsSection scope="general" basePath="/chat" />

          <div className="h-px bg-border/40 mx-3 my-1.5" />

          {/* History */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
            <p className="text-muted-foreground/40 text-[9px] uppercase tracking-[0.12em] font-semibold px-1.5 mb-1.5">
              Histórico
            </p>
            {Object.entries(groups).map(([label, convs]) => {
              if (convs.length === 0) return null;
              return (
                <div key={label} className="mb-3">
                  <p className="text-muted-foreground/35 text-[10px] px-1.5 mb-1">{label}</p>
                  <div className="space-y-0.5">
                    {convs.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        className={`w-full flex flex-col gap-0.5 px-2 py-2 rounded-lg text-left transition-all ${
                          activeId === conv.id
                            ? "bg-muted/40 border border-border/60"
                            : "hover:bg-muted/20 border border-transparent"
                        }`}
                      >
                        <span className="text-foreground/80 text-[12px] font-medium truncate leading-tight">
                          {conv.title}
                        </span>
                        <span className="text-muted-foreground/50 text-[10px] truncate">{conv.preview}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 px-2 text-center">
                <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground/40 text-[11px]">Nenhuma conversa</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Collapse toggle */}
      <div className="p-1.5 border-t border-border/40">
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir painel" : "Recolher painel"}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 text-[11px] transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
