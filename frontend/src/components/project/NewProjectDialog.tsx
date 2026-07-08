"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { projects as projectsApi } from "@/lib/api";
import type { Project, ProjectScope } from "@/types/report";
import { ProjectSettingsForm } from "./ProjectSettingsForm";

interface Props {
  scope: ProjectScope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
}

export function NewProjectDialog({ scope, open, onOpenChange, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>
            Um workspace para organizar conversas, arquivos e instruções em torno de um tema.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <ProjectSettingsForm
          submitLabel="Criar projeto"
          submitting={submitting}
          onSubmit={async (values) => {
            setSubmitting(true);
            setError(null);
            try {
              const project = await projectsApi.create({
                name: values.name,
                description: values.description || undefined,
                color: values.color,
                icon: values.icon,
                instructions: values.instructions || undefined,
                chat_type: scope,
              });
              onCreated(project);
              onOpenChange(false);
            } catch {
              setError("Não foi possível criar o projeto. Tente novamente.");
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
