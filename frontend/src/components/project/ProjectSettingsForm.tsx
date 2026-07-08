"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from "./constants";

export interface ProjectFormValues {
  name: string;
  description: string;
  color: string;
  icon: string;
  instructions: string;
}

interface Props {
  initial?: Partial<ProjectFormValues>;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
  submitting?: boolean;
}

const INSTRUCTIONS_PLACEHOLDER = `Ex.: Responder sempre em português.
Utilizar linguagem técnica.
Priorizar normas SIPAER.
Ser objetivo.`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function ProjectSettingsForm({ initial, submitLabel, onSubmit, submitting }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color || DEFAULT_PROJECT_COLOR);
  const [icon, setIcon] = useState(initial?.icon || DEFAULT_PROJECT_ICON);
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), description, color, icon, instructions });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nome">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do projeto"
          autoFocus
        />
      </Field>

      <Field label="Descrição">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Do que trata este projeto?"
          className="min-h-[60px]"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </div>

      <Field label="Ícone">
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </Field>

      <Field label="Instruções do projeto">
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={INSTRUCTIONS_PLACEHOLDER}
          className="min-h-[120px]"
        />
        <p className="text-[11px] text-muted-foreground/60">
          Enviado automaticamente como contexto em todas as conversas do projeto.
        </p>
      </Field>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={!name.trim() || submitting}>
          {submitting ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
