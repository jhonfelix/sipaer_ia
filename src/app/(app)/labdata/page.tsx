"use client";

import Link from "next/link";
import {
  AudioLines,
  Mic,
  BarChart3,
  ArrowRight,
  FileAudio,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Radio,
  Smartphone,
  Headphones,
} from "lucide-react";


const modules = [
  {
    href: "/labdata/audio",
    icon: Mic,
    accent: "#8b5cf6",
    gradient: "from-violet-600/20 to-violet-900/5",
    badge: "Análise de Áudio",
    title: "Análise Pericial de Áudio",
    description:
      "Processamento forense de gravações de CVR, FDR, celular e tablet. Detecta indícios de edição, cortes, mudanças de ambiente acústico, compressão diferente entre trechos e sinais compatíveis com voz sintética.",
    sources: [
      { icon: Headphones, label: "CVR — Cockpit Voice Recorder" },
      { icon: FileAudio, label: "FDR — Flight Data Recorder" },
      { icon: Smartphone, label: "Celular / Tablet" },
      { icon: Radio, label: "Gravações de rádio" },
    ],
    features: [
      "Detecção de cortes e edições",
      "Análise de integridade do arquivo",
      "MFCCs + Pitch + ZCR",
      "Identificação de voz sintética",
      "Cadeia de custódia acústica",
    ],
    color: "violet",
  },
  {
    href: "/labdata/spectral",
    icon: BarChart3,
    accent: "#06b6d4",
    gradient: "from-cyan-600/20 to-cyan-900/5",
    badge: "Análise Espectral",
    title: "Análise Espectral Aeronáutica",
    description:
      "Análise de assinaturas acústicas de gravações de cockpit, rádio e sons de motor via FFT/STFT. Identifica padrões de falha mecânica, eventos súbitos, vibrações estruturais e permite reconstrução da sequência do acidente.",
    sources: [
      { icon: AudioLines, label: "Sons do motor / rotor" },
      { icon: Activity, label: "Vibrações estruturais" },
      { icon: Layers, label: "Harmônicos de propulsão" },
      { icon: Radio, label: "Rádio + alarmes de cabine" },
    ],
    features: [
      "FFT + STFT — espectrograma completo",
      "Rastreamento de RPM por harmônicos",
      "Detecção de falha de motor",
      "Correlação CVR × FDR",
      "Reconstrução da sequência do acidente",
    ],
    color: "cyan",
  },
];

export default function LabDataHubPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070f1c] overflow-y-auto scrollbar-thin">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl w-full space-y-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#1e3a5f] border border-white/10 flex items-center justify-center">
                  <AudioLines className="w-8 h-8 text-white/80" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">LabData</h1>
              <p className="text-white/40 mt-2 max-w-lg mx-auto">
                Selecione o tipo de análise a ser realizada. Cada módulo utiliza
                técnicas especializadas para diferentes finalidades periciais.
              </p>
            </div>
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Top accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `linear-gradient(to right, transparent, ${m.accent}, transparent)`,
                    }}
                  />
                  {/* Background glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />

                  <div className="relative p-7 flex flex-col gap-5 flex-1">
                    {/* Icon + badge */}
                    <div className="flex items-start justify-between">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: `${m.accent}20`,
                          border: `1px solid ${m.accent}30`,
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: m.accent }} />
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full border"
                        style={{
                          color: m.accent,
                          backgroundColor: `${m.accent}15`,
                          borderColor: `${m.accent}30`,
                        }}
                      >
                        {m.badge}
                      </span>
                    </div>

                    {/* Title + description */}
                    <div className="space-y-2">
                      <h2 className="text-white font-bold text-xl">{m.title}</h2>
                      <p className="text-white/50 text-sm leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    {/* Sources */}
                    <div className="grid grid-cols-2 gap-2">
                      {m.sources.map((s) => {
                        const SIcon = s.icon;
                        return (
                          <div
                            key={s.label}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                          >
                            <SIcon
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: m.accent }}
                            />
                            <span className="text-xs text-white/55">{s.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Features */}
                    <ul className="space-y-1.5 flex-1">
                      {m.features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <div
                            className="w-1 h-1 rounded-full shrink-0"
                            style={{ backgroundColor: m.accent }}
                          />
                          <span className="text-sm text-white/50">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-sm font-semibold transition-all duration-200 group-hover:brightness-110"
                      style={{
                        borderColor: `${m.accent}40`,
                        color: m.accent,
                        backgroundColor: `${m.accent}10`,
                      }}
                    >
                      Iniciar análise
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-center text-white/20 text-xs">
            Todas as análises são realizadas localmente. Os dados não saem do ambiente seguro CENIPA.
          </p>
        </div>
      </div>
    </div>
  );
}
