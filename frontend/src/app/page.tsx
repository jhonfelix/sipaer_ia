"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  FileText,
  AudioLines,
  GraduationCap,
  Building2,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Mic,
  Activity,
  Search,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Sparkles,
  Layers,
  Lock,
  RefreshCw,
  Target,
  Lightbulb,
  Network,
  Rocket,
  Satellite,
  Orbit,
  AlertTriangle,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const modules = [
  {
    id: "relatorios",
    icon: FileText,
    accent: "#3b82f6",
    accentDark: "#1d4ed8",
    gradient: "from-blue-600/20 to-blue-900/5",
    badge: "Relatórios Técnicos",
    title: "Investigação Aeronáutica Assistida por IA",
    description:
      "Apoio completo na elaboração de relatórios técnicos de acidentes e incidentes aeronáuticos, com suporte especializado para aeronaves agrícolas.",
    features: [
      { icon: Sparkles, text: "Geração assistida de documentos" },
      { icon: CheckCircle2, text: "Padronização técnica SIPAER" },
      { icon: Search, text: "Revisão textual inteligente" },
      { icon: Layers, text: "Organização hierárquica de seções" },
    ],
    href: "/reports",
  },
  {
    id: "labdata",
    icon: AudioLines,
    accent: "#8b5cf6",
    accentDark: "#6d28d9",
    gradient: "from-violet-600/20 to-violet-900/5",
    badge: "LabData",
    title: "Transcrição e Análise de Áudio Aeronáutico",
    description:
      "Ferramenta avançada para análise pericial de gravações aeronáuticas, com transcrição automática e análise espectral de sons e ruídos.",
    features: [
      { icon: Mic, text: "Transcrição automática de áudios" },
      { icon: Activity, text: "Análise espectral de ruídos" },
      { icon: Search, text: "Apoio pericial técnico" },
      { icon: FileText, text: "Relatórios de análise de gravações" },
    ],
    href: "/reports",
  },
  {
    id: "dfa",
    icon: GraduationCap,
    accent: "#10b981",
    accentDark: "#047857",
    gradient: "from-emerald-600/20 to-emerald-900/5",
    badge: "DFA – Divisão de Capacitação",
    title: "Chatbot Educacional SIPAER",
    description:
      "Assistente inteligente para apoiar alunos nos cursos do SIPAER, oferecendo explicações, orientações e respostas a dúvidas em tempo real.",
    features: [
      { icon: BookOpen, text: "Explicações sobre conteúdos dos cursos" },
      { icon: MessageSquare, text: "Respostas a dúvidas frequentes" },
      { icon: GraduationCap, text: "Apoio ao estudo contínuo" },
      { icon: CheckCircle2, text: "Orientação sobre procedimentos SIPAER" },
    ],
    href: "/reports",
  },
  {
    id: "da",
    icon: Building2,
    accent: "#f59e0b",
    accentDark: "#b45309",
    gradient: "from-amber-600/20 to-amber-900/5",
    badge: "DA – Divisão Administrativa",
    title: "Assistente de Gestão Administrativa",
    description:
      "Suporte inteligente para atividades administrativas, auxiliando na elaboração de processos licitatórios com base em leis e normas vigentes.",
    features: [
      { icon: ClipboardList, text: "Elaboração de processos de licitação" },
      { icon: FileText, text: "Documentos de contratação" },
      { icon: Shield, text: "Conformidade com normas vigentes" },
      { icon: Search, text: "Sugestões baseadas em legislação" },
    ],
    href: "/reports",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Alta Performance",
    description:
      "Processamento em tempo real com modelos de IA de última geração, reduzindo o tempo de elaboração de relatórios.",
  },
  {
    icon: Shield,
    title: "Segurança Institucional",
    description:
      "Dados protegidos com padrões de segurança militar, garantindo confidencialidade das investigações.",
  },
  {
    icon: Globe,
    title: "Padrão Internacional",
    description:
      "Alinhado com normas ICAO e padrões internacionais de investigação aeronáutica.",
  },
  {
    icon: BarChart3,
    title: "Análise Avançada",
    description:
      "Modelos treinados com dados aeronáuticos especializados, incluindo aviação agrícola.",
  },
  {
    icon: RefreshCw,
    title: "Integração Dédalo",
    description:
      "Sincronização direta com o sistema Dédalo do CENIPA para gestão unificada.",
  },
  {
    icon: Lock,
    title: "Acesso Controlado",
    description:
      "Permissões granulares por perfil: investigador, revisor, gestor e administrador.",
  },
];

const stats = [
  { value: "5", label: "Módulos integrados" },
  { value: "CENIPA", label: "Padrão oficial" },
  { value: "SIPAE", label: "Investigação espacial" },
  { value: "IA", label: "Tecnologia de ponta" },
];

// ─── Components ──────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0d1b2e]/95 backdrop-blur-md border-b border-white/10 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-wide">
              SIPAER
            </span>
            <span className="text-blue-400 font-bold text-base"> AI</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {["Soluções", "Benefícios", "Sobre"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
        >
          Acessar Plataforma
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#050d1a]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-blue-900/20 blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Inteligência Artificial para Aviação</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
              O futuro da
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-violet-400 bg-clip-text text-transparent">
                investigação
              </span>
              <br />
              aeronáutica
            </h1>
            <p className="text-lg text-white/60 leading-relaxed max-w-lg">
              Plataforma integrada de IA para apoiar todas as áreas do{" "}
              <span className="text-white/80">SIPAER</span> — da elaboração de
              relatórios técnicos à capacitação e gestão administrativa.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              Acessar a Plataforma
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#soluções"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 hover:border-white/20 font-medium transition-all duration-200"
            >
              Conhecer os módulos
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — visual card mockup */}
        <div className="hidden lg:block relative">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
            {/* Fake header bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#1e3a5f] border-b border-white/10">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">SIPAER AI</span>
              <span className="ml-auto text-white/40 text-xs">v1.0 CENIPA</span>
            </div>

            {/* Content simulation */}
            <div className="p-6 space-y-4 bg-[#0d1b2e]">
              {/* AI chat bubble */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-white/70 text-xs leading-relaxed">
                    Analisando o relatório de ocorrência{" "}
                    <span className="text-blue-400 font-mono">
                      #OC-2024-0312
                    </span>
                    ...
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {[85, 60, 40].map((w, i) => (
                      <div
                        key={i}
                        className="h-1.5 bg-white/10 rounded-full overflow-hidden"
                        style={{ width: `${w}%` }}
                      >
                        <div className="h-full bg-blue-500/50 rounded-full w-2/3" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section list */}
              {[
                "1. Sinopse",
                "2. Aeronave Envolvida",
                "3. Informações Meteorológicas",
                "4. Análise",
                "5. Conclusão",
              ].map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      i < 3 ? "text-blue-400" : "text-white/20"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      i < 3 ? "text-white/70" : "text-white/30"
                    }`}
                  >
                    {s}
                  </span>
                  {i < 3 && (
                    <span className="ml-auto text-[10px] text-emerald-400">
                      Concluído
                    </span>
                  )}
                </div>
              ))}

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-white/40">
                  <span>Completude do relatório</span>
                  <span className="text-blue-400">60%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -top-4 -right-4 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-medium shadow-lg backdrop-blur-sm">
            IA Ativa
          </div>
          <div className="absolute -bottom-4 -left-4 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-400/20 text-violet-400 text-xs font-medium shadow-lg backdrop-blur-sm">
            Análise em tempo real
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleCard({ module }: { module: (typeof modules)[0] }) {
  const Icon = module.icon;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 overflow-hidden hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl">
      {/* Gradient accent top */}
      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
        style={{ color: module.accent }}
      />

      {/* Background glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      <div className="relative p-6 flex flex-col gap-5 flex-1">
        {/* Icon + badge */}
        <div className="flex items-start justify-between">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `${module.accent}20`,
              border: `1px solid ${module.accent}30`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: module.accent }} />
          </div>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{
              color: module.accent,
              backgroundColor: `${module.accent}15`,
              borderColor: `${module.accent}30`,
            }}
          >
            {module.badge}
          </span>
        </div>

        {/* Title + description */}
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-lg leading-snug">
            {module.title}
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            {module.description}
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-2 flex-1">
          {module.features.map((f) => {
            const FIcon = f.icon;
            return (
              <li key={f.text} className="flex items-center gap-2.5">
                <FIcon
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: module.accent }}
                />
                <span className="text-sm text-white/60">{f.text}</span>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <Link
          href={module.href}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 mt-2 hover:brightness-110"
          style={{
            borderColor: `${module.accent}40`,
            color: module.accent,
            backgroundColor: `${module.accent}10`,
          }}
        >
          Acessar módulo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function BenefitCard({ benefit }: { benefit: (typeof benefits)[0] }) {
  const Icon = benefit.icon;
  return (
    <div className="flex gap-4 p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200">
      <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-400/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <div className="space-y-1">
        <h4 className="text-white font-medium text-sm">{benefit.title}</h4>
        <p className="text-white/50 text-sm leading-relaxed">
          {benefit.description}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050d1a] text-white">
      <Navbar />

      <Hero />

      {/* Modules Section */}
      <section id="soluções" className="py-24 bg-[#07111f]">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-sm">
              <Layers className="w-3.5 h-3.5" />
              <span>Soluções integradas</span>
            </div>
            <h2 className="text-4xl font-bold text-white">
              Quatro módulos,{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                uma plataforma
              </span>
            </h2>
            <p className="text-white/50 text-lg">
              A SIPAER AI cobre todas as necessidades operacionais, desde a
              investigação técnica até a gestão administrativa.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {modules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>

          {/* SIPAE — Destaque espacial */}
          <div className="mt-6 relative rounded-2xl overflow-hidden border border-violet-400/20 bg-gradient-to-br from-violet-950/60 via-[#0d1b2e] to-indigo-950/40">
            {/* Stars background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(28)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: i % 4 === 0 ? "2px" : "1px",
                    height: i % 4 === 0 ? "2px" : "1px",
                    top: `${(i * 37 + 11) % 100}%`,
                    left: `${(i * 53 + 7) % 100}%`,
                    opacity: 0.2 + (i % 5) * 0.08,
                  }}
                />
              ))}
            </div>
            {/* Glow */}
            <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-violet-600/10 blur-[80px]" />
            <div className="absolute left-1/3 bottom-0 w-64 h-32 rounded-full bg-indigo-600/10 blur-[60px]" />

            <div className="relative p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Left: icon + badge + title */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
                    <Rocket className="w-7 h-7 text-violet-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300">
                        NOVO
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-xl leading-tight">SIPAE</h3>
                    <p className="text-violet-300/80 text-sm font-medium">
                      Investigação de Atividades Espaciais
                    </p>
                  </div>
                </div>
              </div>

              {/* Center: description */}
              <div className="lg:col-span-1 space-y-3">
                <p className="text-white/60 text-sm leading-relaxed">
                  O{" "}
                  <span className="text-violet-400 font-medium">CENIPA</span>{" "}
                  passa a liderar também o{" "}
                  <span className="text-white/80 font-medium">
                    Sistema de Investigação e Prevenção de Acidentes em
                    Atividades Espaciais (SIPAE)
                  </span>
                  , expandindo o escopo institucional para além da aviação.
                </p>
              </div>

              {/* Right: feature pills */}
              <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: Orbit, text: "Investigação de acidentes espaciais" },
                  { icon: Satellite, text: "Supervisão técnica centralizada" },
                  { icon: AlertTriangle, text: "Prevenção em atividades espaciais" },
                  { icon: Shield, text: "Normatização sob o Comando da Aeronáutica" },
                ].map((f) => {
                  const FIcon = f.icon;
                  return (
                    <div
                      key={f.text}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-400/15"
                    >
                      <FIcon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="text-xs text-white/60">{f.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefícios" className="py-24 bg-[#050d1a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-sm">
                <Shield className="w-3.5 h-3.5" />
                <span>Por que escolher</span>
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Tecnologia confiável
                <br />
                <span className="text-white/40">para decisões críticas</span>
              </h2>
              <p className="text-white/50 leading-relaxed">
                Desenvolvida com foco nas necessidades específicas do SIPAER, a
                plataforma oferece ferramentas robustas e seguras para apoiar
                investigadores, instrutores e administradores.
              </p>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40"
              >
                Começar agora
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((b) => (
                <BenefitCard key={b.title} benefit={b} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="py-24 bg-[#07111f]">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-sm">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Origem do projeto</span>
            </div>
            <h2 className="text-4xl font-bold text-white">
              Sobre a{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                SIPAER AI
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Texto principal */}
            <div className="space-y-6">
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-5">
                {/* Glow sutil */}
                <div className="absolute top-0 left-8 w-32 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

                <p className="text-white/70 leading-relaxed text-base">
                  A <span className="text-white font-semibold">SIPAER AI</span>{" "}
                  nasceu de um processo criterioso de análise e mapeamento das
                  iniciativas tecnológicas preconizadas pelo{" "}
                  <span className="text-blue-400 font-medium">CENIPA</span>.
                  A partir do levantamento das demandas institucionais, os
                  projetos foram sistematicamente categorizados, avaliados
                  quanto ao impacto operacional e priorizados conforme a
                  criticidade de cada área.
                </p>

                <p className="text-white/70 leading-relaxed text-base">
                  Dessa análise emergiu uma plataforma transversal, capaz de
                  permear praticamente todos os setores do CENIPA — integrando
                  em um único ambiente as necessidades da investigação técnica,
                  da análise pericial, da capacitação de pessoal e da gestão
                  administrativa.
                </p>

                <p className="text-white/70 leading-relaxed text-base">
                  Atenção especial foi dedicada à{" "}
                  <span className="text-white font-semibold">
                    Divisão Operacional
                  </span>
                  , responsável pelo núcleo das atividades de investigação de
                  acidentes e incidentes aeronáuticos. Para essa divisão, a IA
                  oferece suporte direto na elaboração de relatórios técnicos,
                  garantindo padronização, rigor metodológico e agilidade no
                  registro das ocorrências — incluindo o crescente universo da
                  aviação agrícola.
                </p>

                {/* SIPAE highlight */}
                <div className="relative rounded-xl border border-violet-400/20 bg-violet-500/5 p-5 space-y-2">
                  <div className="absolute top-0 left-6 w-24 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
                  <div className="flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-violet-400" />
                    <span className="text-violet-300 font-semibold text-sm">
                      Expansão para o espaço — SIPAE
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 font-medium">
                      NOVO
                    </span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    O CENIPA amplia sua missão e passa a
                    coordenar o{" "}
                    <span className="text-violet-300 font-medium">
                      Sistema de Investigação e Prevenção de Acidentes em
                      Atividades Espaciais (SIPAE)
                    </span>
                    . A SIPAER AI está preparada para acompanhar essa expansão,
                    estendendo suas capacidades ao novo domínio operacional do
                    Comando da Aeronáutica.
                  </p>
                </div>
              </div>
            </div>

            {/* Cards de pilares */}
            <div className="space-y-4">
              {[
                {
                  icon: Target,
                  color: "#3b82f6",
                  title: "Origem estratégica",
                  text: "Desenvolvida a partir de um processo formal de análise, categorização e priorização dos projetos tecnológicos do CENIPA, assegurando alinhamento com os objetivos institucionais.",
                },
                {
                  icon: Network,
                  color: "#8b5cf6",
                  title: "Alcance transversal",
                  text: "A plataforma foi concebida para atender todos os setores do CENIPA, promovendo integração entre as divisões operacional, de capacitação, laboratorial e administrativa.",
                },
                {
                  icon: Shield,
                  color: "#10b981",
                  title: "Foco na Divisão Operacional",
                  text: "Com atenção prioritária às atividades de investigação, a IA apoia investigadores em campo e na redação de relatórios, respeitando os padrões técnicos do SIPAER e as normas ICAO.",
                },
                {
                  icon: Sparkles,
                  color: "#f59e0b",
                  title: "Evolução contínua",
                  text: "A cada novo ciclo de priorização, novos módulos e funcionalidades são incorporados à plataforma, acompanhando as demandas dinâmicas do sistema de segurança aeronáutica.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex gap-4 p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${item.color}20`,
                        border: `1px solid ${item.color}30`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-semibold text-sm">
                        {item.title}
                      </h4>
                      <p className="text-white/50 text-sm leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-[#050d1a]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-blue-900/40 via-[#0d1b2e] to-violet-900/20 p-12 shadow-2xl">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-blue-600/20 blur-[80px]" />

            <div className="relative space-y-6">
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-blue-400" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-bold text-white">
                  Pronto para transformar
                  <br />a investigação aeronáutica?
                </h2>
                <p className="text-white/50 text-lg max-w-xl mx-auto">
                  Acesse a plataforma SIPAER AI e experimente o poder da
                  inteligência artificial aplicada à segurança da aviação.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                >
                  Acessar a Plataforma
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 bg-[#050d1a]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="text-white font-bold text-sm">SIPAER</span>
              <span className="text-blue-400 font-bold text-sm"> AI</span>
              <span className="text-white/30 text-xs ml-2">v1.0 CENIPA</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-white/40">
            {modules.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="hover:text-white/70 transition-colors"
              >
                {m.badge.split("–")[0].trim()}
              </Link>
            ))}
          </div>

          <p className="text-white/30 text-xs">
            © 2026 CENIPA / SIPAER. Sistema em desenvolvimento.
          </p>
        </div>
      </footer>
    </div>
  );
}
