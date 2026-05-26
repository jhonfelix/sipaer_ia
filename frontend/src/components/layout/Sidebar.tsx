"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquarePlus,
  FileText,
  AudioLines,
  Building2,
  LayoutDashboard,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    exact: true,
  },
  {
    id: "reports",
    label: "Gerenciar Relatórios",
    icon: FileText,
    href: "/reports",
  },
  {
    id: "labdata",
    label: "Análise Áudio",
    icon: AudioLines,
    href: "/labdata",
    //badge: "LabData",
  },
  {
    id: "da",
    label: "Gestão Administrativa",
    icon: Building2,
    href: "/da",
  },
  {
    id: "knowledge",
    label: "Base de Conhecimento",
    icon: BookOpen,
    href: "/knowledge",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(item: (typeof navItems)[0]) {
    if (item.exact) return pathname === item.href;
    return pathname?.startsWith(item.href);
  }

  return (
    <aside
      className={`flex flex-col bg-card border-r border-border transition-all duration-300 shrink-0 ${
        collapsed ? "w-[60px]" : "w-64"
      }`}
    >
      {/* New chat button */}
      <div className="p-3 pt-4">
        <Link
          href="/chat"
          title={collapsed ? "Novo bate-papo" : undefined}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-blue-600/20 ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Novo bate-papo</span>}
        </Link>
      </div>

      <div className="h-px bg-border mx-3 mb-1" />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/25"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="truncate leading-none">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir" : "Recolher"}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/20 text-sm transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
