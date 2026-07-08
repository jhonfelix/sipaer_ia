"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, MessageSquare, FileText, Settings2, Trash2 } from "lucide-react";
import { projects as projectsApi } from "@/lib/api";
import type { ChatSession } from "@/lib/api";
import type { Project, ProjectScope } from "@/types/report";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProjectChat } from "./ProjectChat";
import { ProjectFiles } from "./ProjectFiles";
import { ProjectSettingsForm } from "./ProjectSettingsForm";
import { resolveProjectIcon, DEFAULT_PROJECT_COLOR } from "./constants";

interface Props {
  projectId: string;
  scope: ProjectScope;
}

export function ProjectWorkspace({ projectId, scope }: Props) {
  const router = useRouter();
  const backHref = scope === "da" ? "/da" : "/chat";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSessions = useCallback(() => {
    projectsApi.sessions(projectId).then(setSessions).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    projectsApi
      .get(projectId)
      .then(setProject)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    loadSessions();
  }, [projectId, loadSessions]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground/50 text-sm">
        Carregando projeto…
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground/60 text-sm">Projeto não encontrado.</p>
        <Button variant="outline" onClick={() => router.push(backHref)}>
          Voltar
        </Button>
      </div>
    );
  }

  const color = project.color || DEFAULT_PROJECT_COLOR;
  const Icon = resolveProjectIcon(project.icon);

  async function handleDelete() {
    if (!confirm("Excluir este projeto? As conversas serão desvinculadas e os arquivos removidos.")) {
      return;
    }
    try {
      await projectsApi.remove(projectId);
      router.push(backHref);
    } catch {
      /* mantém na tela */
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      {/* Cabeçalho */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border/50">
        <button
          onClick={() => router.push(backHref)}
          title="Voltar"
          className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground/60 hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-foreground font-semibold text-sm leading-none truncate">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground/50 text-[11px] mt-0.5 truncate">{project.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="conversas" className="flex-1 min-h-0 gap-0">
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/40">
          <TabsList>
            <TabsTrigger value="conversas">
              <MessageSquare /> Conversas
            </TabsTrigger>
            <TabsTrigger value="arquivos">
              <FileText /> Arquivos
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings2 /> Configurações
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Conversas */}
        <TabsContent value="conversas" className="flex min-h-0">
          <aside className="w-60 shrink-0 flex flex-col border-r border-border/40 bg-card">
            <div className="p-2.5">
              <button
                onClick={() => setActiveSessionId(null)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/18 hover:bg-blue-600/28 border border-blue-500/22 text-blue-600 dark:text-blue-300 font-medium text-[13px] transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Nova conversa
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0 space-y-0.5">
              {sessions.map((s) => (
                <button
                  key={s.sessionId}
                  onClick={() => setActiveSessionId(s.sessionId)}
                  className={`w-full flex flex-col gap-0.5 px-2 py-2 rounded-lg text-left transition-all ${
                    activeSessionId === s.sessionId
                      ? "bg-muted/40 border border-border/60"
                      : "hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  <span className="text-foreground/80 text-[12px] font-medium truncate leading-tight">
                    {s.title}
                  </span>
                  <span className="text-muted-foreground/50 text-[10px] truncate">{s.preview}</span>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground/40 py-6">
                  Nenhuma conversa ainda.
                </p>
              )}
            </div>
          </aside>

          <ProjectChat
            projectId={Number(project.id)}
            scope={scope}
            sessionId={activeSessionId}
            onSessionCreated={(sid) => {
              setActiveSessionId(sid);
              loadSessions();
            }}
          />
        </TabsContent>

        {/* Arquivos */}
        <TabsContent value="arquivos" className="overflow-y-auto">
          <ProjectFiles projectId={Number(project.id)} />
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="config" className="overflow-y-auto">
          <div className="max-w-lg mx-auto p-6 space-y-6">
            <ProjectSettingsForm
              submitLabel="Salvar alterações"
              submitting={savingSettings}
              initial={{
                name: project.name,
                description: project.description ?? "",
                color: project.color ?? DEFAULT_PROJECT_COLOR,
                icon: project.icon ?? undefined,
                instructions: project.instructions ?? "",
              }}
              onSubmit={async (values) => {
                setSavingSettings(true);
                try {
                  const updated = await projectsApi.update(projectId, {
                    name: values.name,
                    description: values.description || null,
                    color: values.color,
                    icon: values.icon,
                    instructions: values.instructions || null,
                  });
                  setProject(updated);
                } finally {
                  setSavingSettings(false);
                }
              }}
            />

            <div className="pt-4 border-t border-border/40">
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" /> Excluir projeto
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
