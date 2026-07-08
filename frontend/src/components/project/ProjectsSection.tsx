"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { projects as projectsApi } from "@/lib/api";
import type { Project, ProjectScope } from "@/types/report";
import { NewProjectDialog } from "./NewProjectDialog";
import { resolveProjectIcon, DEFAULT_PROJECT_COLOR } from "./constants";

interface Props {
  scope: ProjectScope;
  /** Rota base do silo — "/chat" ou "/da". O projeto abre em `${basePath}/projetos/[id]`. */
  basePath: string;
  activeProjectId?: string;
}

export function ProjectsSection({ scope, basePath, activeProjectId }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    projectsApi.list(scope).then(setProjects).catch(() => {});
  }, [scope]);

  function open(id: string) {
    router.push(`${basePath}/projetos/${id}`);
  }

  return (
    <div className="px-2 pt-1 pb-1">
      <div className="flex items-center justify-between px-1.5 mb-1.5">
        <p className="text-muted-foreground/40 text-[9px] uppercase tracking-[0.12em] font-semibold">
          Projetos
        </p>
        <button
          onClick={() => setDialogOpen(true)}
          title="Novo projeto"
          className="p-0.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 transition-all"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-0.5">
        {projects.map((p) => {
          const color = p.color || DEFAULT_PROJECT_COLOR;
          const Icon = resolveProjectIcon(p.icon);
          const active = activeProjectId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => open(p.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                active
                  ? "bg-muted/40 text-foreground border border-border/60"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/25 border border-transparent"
              }`}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}22`, color }}
              >
                <Icon className="w-3 h-3" />
              </span>
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}

        {projects.length === 0 && (
          <button
            onClick={() => setDialogOpen(true)}
            className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/20 transition-all"
          >
            Criar primeiro projeto…
          </button>
        )}
      </div>

      <NewProjectDialog
        scope={scope}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(project) => {
          setProjects((prev) => [project, ...prev]);
          open(project.id);
        }}
      />
    </div>
  );
}
