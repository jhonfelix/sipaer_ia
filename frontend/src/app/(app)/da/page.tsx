"use client";

import { useState, useRef, useEffect } from "react";
import {
  Building2, Send, Sparkles, FileText, ClipboardList, Scale,
  CheckCircle2, ChevronRight, Copy, Download, FileEdit, RotateCcw,
  BookOpen, AlertCircle, Search, X, User2, Check, Plus,
} from "lucide-react";
import { chat as chatApi } from "@/lib/api";
import { MarkdownRenderer, ModelSelector } from "@/components/chat";
import type { AIMessage } from "@/types/report";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
  category: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  { id: "q1", label: "Elaborar Edital de Licitação", icon: ClipboardList, category: "Licitação", prompt: "Elabore um modelo de edital de licitação na modalidade Pregão Eletrônico para contratação de serviços de TI, conforme a Lei 14.133/2021." },
  { id: "q2", label: "Termo de Referência", icon: FileText, category: "Licitação", prompt: "Crie um Termo de Referência para aquisição de equipamentos de informática, incluindo especificações técnicas, critérios de habilitação e condições de entrega." },
  { id: "q3", label: "Minuta de Contrato", icon: Scale, category: "Contratos", prompt: "Gere uma minuta de contrato administrativo para prestação de serviços continuados, com cláusulas de vigência, reajuste, penalidades e rescisão conforme legislação vigente." },
  { id: "q4", label: "DFD – Documento de Formalização", icon: ClipboardList, category: "Licitação", prompt: "Elabore um DFD (Documento de Formalização de Demanda) para contratação de serviço de limpeza e conservação, conforme IN SEGES 58/2022." },
  { id: "q5", label: "Pesquisa de Preços", icon: Search, category: "Licitação", prompt: "Oriente como realizar pesquisa de preços para subsidiar contratação pública, conforme a IN SEGES 65/2021, indicando fontes e metodologia de cálculo do valor estimado." },
  { id: "q6", label: "Verificar Conformidade", icon: CheckCircle2, category: "Conformidade", prompt: "Verifique os principais pontos de conformidade legal que um processo licitatório deve atender conforme a Nova Lei de Licitações (Lei 14.133/2021)." },
  { id: "q7", label: "Análise Jurídica", icon: Scale, category: "Conformidade", prompt: "Realize uma análise dos principais riscos jurídicos em contratos administrativos e como mitigá-los." },
  { id: "q8", label: "Portaria Interna", icon: FileText, category: "Documentos", prompt: "Elabore um modelo de portaria interna para designação de comissão de licitação, com os requisitos legais necessários." },
];

const LEGAL_REFS = [
  { label: "Lei 14.133/2021", sub: "Nova Lei de Licitações e Contratos" },
  { label: "Lei 8.666/93", sub: "Lei de Licitações (vigência parcial)" },
  { label: "IN SEGES 58/2022", sub: "Serviços Continuados" },
  { label: "IN SEGES 65/2021", sub: "Pesquisa de Preços" },
  { label: "Decreto 10.024/2019", sub: "Pregão Eletrônico" },
  { label: "Lei 10.520/2002", sub: "Modalidade Pregão" },
];

const STARTERS = [
  { icon: ClipboardList, color: "text-amber-400", bg: "bg-amber-400/10", title: "Edital de Licitação", description: "Elabore editais de Pregão Eletrônico conforme Lei 14.133/2021", prompt: "Elabore um modelo de edital de licitação na modalidade Pregão Eletrônico para contratação de serviços de TI, conforme a Lei 14.133/2021." },
  { icon: FileText, color: "text-orange-400", bg: "bg-orange-400/10", title: "Termo de Referência", description: "Crie TRs com especificações técnicas e critérios de habilitação", prompt: "Crie um Termo de Referência para aquisição de equipamentos de informática, incluindo especificações técnicas e critérios de habilitação." },
  { icon: Scale, color: "text-yellow-400", bg: "bg-yellow-400/10", title: "Análise Jurídica", description: "Analise riscos e conformidade em contratos administrativos", prompt: "Realize uma análise dos principais riscos jurídicos em contratos administrativos e como mitigá-los conforme a Lei 14.133/2021." },
];

// ─── Message actions ──────────────────────────────────────────────────────────

function ActionBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border hover:border-border/80 text-muted-foreground/60 hover:text-foreground text-[11px] transition-all">
      {children}
    </button>
  );
}

function MessageActions({ content, onContinue }: { content: string; onContinue: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportMd() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `da-sipaer-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
      <ActionBtn onClick={copy} title={copied ? "Copiado!" : "Copiar resposta"}>
        {copied ? <><Check className="w-3 h-3" /><span>Copiado</span></> : <><Copy className="w-3 h-3" /><span>Copiar</span></>}
      </ActionBtn>
      <ActionBtn onClick={exportMd} title="Exportar como Markdown">
        <Download className="w-3 h-3" /><span>Exportar</span>
      </ActionBtn>
      <ActionBtn onClick={onContinue} title="Continuar geração">
        <RotateCcw className="w-3 h-3" /><span>Continuar</span>
      </ActionBtn>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export default function DAPage() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("gpt-oss-120b");
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [search, setSearch] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    const userMsg: AIMessage = { id: `u-${uid()}`, role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const reply = await chatApi.send({ message: msg, session_id: sessionId, model, chat_type: "da" });
      setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), userMsg, reply]);
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === userMsg.id ? { ...m, content: m.content + "\n\n*(Erro ao enviar — tente novamente.)*" } : m
      ));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function newConversation() {
    window.location.reload();
  }

  function continueFromMsg(content: string) {
    setInput("Continue a partir de: " + content.slice(-80) + "...");
    textareaRef.current?.focus();
  }

  const hasMessages = messages.length > 0 || sending;
  const categories = ["Todos", ...Array.from(new Set(QUICK_ACTIONS.map(a => a.category)))];
  const filtered = QUICK_ACTIONS.filter(a =>
    (activeCategory === "Todos" || a.category === activeCategory) &&
    (search === "" || a.label.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-1 h-full min-h-0 overflow-hidden">

      {/* ── Left Sidebar ── */}
      <div className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/25 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">DA</p>
              <p className="text-muted-foreground/60 text-[10px]">Divisão Administrativa</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ação..." className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted/40 border border-border text-foreground/70 placeholder:text-muted-foreground/50 text-xs outline-none focus:border-amber-400/30 focus:bg-muted/60 transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" /></button>}
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-border">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)} className={`px-2 py-0.5 rounded-full text-[11px] transition-all ${activeCategory === c ? "bg-amber-500/20 border border-amber-400/30 text-amber-300" : "bg-muted/40 border border-border text-muted-foreground hover:text-foreground/60"}`}>{c}</button>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground/50 text-xs text-center py-6">Nenhuma ação encontrada</p>
          ) : filtered.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.id} onClick={() => handleSend(a.prompt)} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left group">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-400/15 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/70 text-xs font-medium group-hover:text-foreground/90 truncate">{a.label}</p>
                  <p className="text-muted-foreground/50 text-[10px]">{a.category}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-amber-400 shrink-0 transition-colors" />
              </button>
            );
          })}
        </div>

        {/* Legal refs */}
        <div className="border-t border-border px-3 py-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-muted-foreground/60 text-[10px] uppercase tracking-wider">Base Normativa</p>
          </div>
          {LEGAL_REFS.map(r => (
            <div key={r.label} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400/40 shrink-0 mt-1.5" />
              <div>
                <p className="text-amber-400/80 text-[11px] font-mono font-medium">{r.label}</p>
                <p className="text-muted-foreground/50 text-[10px]">{r.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main chat ── */}
      <div className="flex flex-col flex-1 min-h-0 bg-background">

        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-800/25 border border-amber-400/18 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-foreground font-semibold text-[13px] leading-none">Assistente Administrativo — DA</h1>
              <p className="text-muted-foreground/50 text-[10px] mt-0.5 leading-none">Licitações · Contratos · Conformidade · Lei 14.133/2021</p>
            </div>
          </div>
          <button onClick={newConversation} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground/60 hover:text-foreground text-xs font-medium transition-all">
            <Plus className="w-3.5 h-3.5" />Nova conversa
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">

          {/* Empty state */}
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center h-full gap-8 py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-900/30 border border-amber-400/18 flex items-center justify-center shadow-2xl shadow-amber-900/25">
                    <Sparkles className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-amber-500/25 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
                  </div>
                </div>
                <div>
                  <h2 className="text-foreground font-semibold text-base tracking-tight">Assistente de Licitações e Contratos</h2>
                  <p className="text-muted-foreground/50 text-sm mt-1">Como posso ajudar hoje?</p>
                </div>
              </div>

              {/* Starter cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 w-full max-w-2xl">
                {STARTERS.map(s => {
                  const Icon = s.icon;
                  return (
                    <button key={s.title} onClick={() => { setInput(s.prompt); setTimeout(() => textareaRef.current?.focus(), 50); }} className="flex flex-col gap-3 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/50 hover:border-border text-left transition-all">
                      <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-foreground/80 text-[13px] font-semibold leading-tight">{s.title}</p>
                        <p className="text-muted-foreground/50 text-[11px] mt-0.5 leading-snug">{s.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message list */}
          {hasMessages && (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map(msg =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="flex items-end gap-2.5 max-w-[80%]">
                      <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-amber-600/20 border border-amber-500/20 text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-amber-600/18 border border-amber-500/22 flex items-center justify-center shrink-0 mb-0.5">
                        <User2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-3 group/msg">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600/15 to-amber-800/20 border border-amber-400/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl rounded-tl-sm bg-muted/25 border border-border/60 px-4 py-3.5">
                        <MarkdownRenderer content={msg.content} />
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest font-medium mb-1.5">Fontes</p>
                            <div className="flex flex-wrap gap-1.5">
                              {[...new Set(msg.sources)].map((src, i) => (
                                <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-muted/30 border border-border/60 text-muted-foreground/60">{src}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <MessageActions content={msg.content} onContinue={() => continueFromMsg(msg.content)} />
                    </div>
                  </div>
                )
              )}

              {/* Typing indicator */}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600/15 to-amber-800/20 border border-amber-400/15 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-muted/25 border border-border/60">
                    <span className="flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: `${i * 160}ms` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border/50 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl bg-muted/30 border border-border focus-within:border-amber-500/30 focus-within:bg-muted/40 transition-all overflow-hidden">
              <div className="flex items-end gap-2 px-3 py-2.5">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); resize(); }}
                  onKeyDown={onKeyDown}
                  placeholder="Descreva o documento ou dúvida administrativa… (Enter para enviar · Shift+Enter nova linha)"
                  rows={1}
                  className="flex-1 bg-transparent text-foreground/90 placeholder:text-muted-foreground/40 text-sm leading-relaxed resize-none focus:outline-none py-1"
                  style={{ minHeight: "32px", maxHeight: "200px" }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-amber-600/20 shrink-0 mb-0.5"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between px-3 pb-2.5">
                <ModelSelector value={model} onChange={setModel} />
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground/40 text-[10px]">Consulte sempre o setor jurídico para decisões formais.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
