"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AIModel {
  id: string;
  name: string;
  shortName: string;
  description: string;
  badge: string;
  dot: string;
  iconBg: string;
  iconText: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "gpt-oss-20b",
    name: "GPT OSS 20B",
    shortName: "GPT OSS",
    description: "Melhor para relatórios complexos",
    badge: "Recomendado",
    dot: "bg-emerald-400",
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-300",
  },
  {
    id: "qwen-3-6-30b",
    name: "Qwen 3.6 30B",
    shortName: "Qwen",
    description: "Excelente para análise técnica",
    badge: "Análise",
    dot: "bg-orange-400",
    iconBg: "bg-orange-500/15",
    iconText: "text-orange-300",
  },
  {
    id: "llama-3-2",
    name: "Llama 3.2",
    shortName: "Llama",
    description: "Modelo local privado",
    badge: "Local",
    dot: "bg-sky-400",
    iconBg: "bg-sky-500/15",
    iconText: "text-sky-300",
  },
  {
    id: "sipaer-fine-tuned",
    name: "SIPAER Fine-Tuned",
    shortName: "SIPAER",
    description: "Especializado em investigação aeronáutica",
    badge: "SIPAER",
    dot: "bg-amber-400",
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-300",
  },
];

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12] text-white/55 hover:text-white/80 text-xs font-medium transition-all">
          <span className={`w-1.5 h-1.5 rounded-full ${selected.dot} shrink-0`} />
          <span>{selected.shortName}</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[280px] p-2 bg-[#08101e] border border-[#1a2f4a] shadow-2xl shadow-black/60 rounded-xl"
      >
        <p className="text-white/25 text-[9px] uppercase tracking-[0.12em] font-semibold px-2 pb-2">
          Modelo de IA
        </p>
        <div className="space-y-0.5">
          {AI_MODELS.map((model) => {
            const active = value === model.id;
            return (
              <button
                key={model.id}
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  active
                    ? "bg-blue-600/10 border border-blue-500/20"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg ${model.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
                >
                  <span className={`text-[11px] font-bold ${model.iconText}`}>
                    {model.name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white/88 text-[13px] font-medium">{model.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md ${model.iconBg} ${model.iconText} font-semibold uppercase tracking-wide`}
                    >
                      {model.badge}
                    </span>
                  </div>
                  <p className="text-white/38 text-[11px] mt-0.5">{model.description}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
