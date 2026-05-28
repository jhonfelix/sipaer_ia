"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, X, ChevronDown, ExternalLink,
  ClipboardPaste, Check, Sparkles, Zap,
  ScanSearch, SpellCheck, ImageOff, FileWarning, Pencil, ListChecks,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { chat as chatApi } from "@/lib/api";
import { AI_MODELS } from "@/components/chat";
import type { AIMessage } from "@/types/report";
import type { Editor } from "@tiptap/react";

// ── Ações rápidas focadas em relatório ───────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: "situacao",
    icon: ScanSearch,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Analisar situação",
    prompt: (section: string) =>
      `Analise a situação descrita na seção "${section}": contexto operacional, condições do voo, sequência de eventos e fatores de risco identificados. Seja objetivo e técnico conforme NSCA 3-13.`,
  },
  {
    id: "gramatical",
    icon: SpellCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "Estrutura gramatical",
    prompt: (section: string) =>
      `Revise a estrutura gramatical e a clareza do texto da seção "${section}". Corrija erros, melhore a coesão e garanta linguagem técnica formal adequada para um relatório oficial CENIPA/FAB.`,
  },
  {
    id: "imagem",
    icon: ImageOff,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "Imagem sem legenda",
    prompt: (section: string) =>
      `Identifique imagens, figuras ou diagramas na seção "${section}" que estejam sem legenda ou com legenda inadequada. Sugira legendas descritivas conforme o padrão SIPAER de documentação técnica.`,
  },
  {
    id: "lacunas",
    icon: FileWarning,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Lacunas no relatório",
    prompt: (section: string) =>
      `Identifique lacunas, informações ausentes ou inconsistências na seção "${section}" que possam comprometer a completude do relatório final SIPAER. Liste o que ainda precisa ser preenchido.`,
  },
  {
    id: "redacao",
    icon: Pencil,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    label: "Melhorar redação",
    prompt: (section: string) =>
      `Reescreva o texto da seção "${section}" com maior precisão técnica, objetividade e conformidade com os padrões de redação oficial SIPAER. Mantenha os fatos, melhore a forma.`,
  },
  {
    id: "checklist",
    icon: ListChecks,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Checklist SIPAER",
    prompt: (section: string) =>
      `Aplique o checklist de qualidade SIPAER na seção "${section}": verifique conformidade com NSCA 3-13, presença de todos os campos obrigatórios, terminologia correta e referências normativas necessárias.`,
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AIAssistantPanelProps {
  messages: AIMessage[];
  onSendMessage: (message: string, model: string) => void;
  model: string;
  onModelChange: (id: string) => void;
  onClose?: () => void;
  editor?: Editor | null;
  activeSection?: string;
  reportId?: number;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AIAssistantPanel({
  messages,
  onSendMessage,
  model,
  onModelChange,
  onClose,
  editor,
  activeSection = "seção atual",
  reportId,
}: AIAssistantPanelProps) {
  const [input,         setInput]         = useState("");
  const [showModelMenu, setShowModelMenu] = useState(false);

  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modelRef  = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const hasMessages = messages.length > 0;
  const currentModel = AI_MODELS.find((m) => m.id === model) ?? AI_MODELS[0];

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node))
        setShowModelMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Auto-resize textarea
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text, model);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  }, [input, model, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (promptFn: (s: string) => string) => {
    const prompt = promptFn(activeSection);
    onSendMessage(prompt, model);
  };

  const handleInsert = (content: string) => {
    if (!editor) {
      toast({ description: "Editor não disponível", variant: "destructive" });
      return;
    }
    const html = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .split("\n\n")
      .map((b) => `<p>${b.replace(/\n/g, "<br>")}</p>`)
      .join("");
    editor.chain().focus().insertContent(html).run();
    toast({ description: "Texto inserido no editor", variant: "success" });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <aside className="w-[440px] shrink-0 flex flex-col h-full bg-background border-l border-border overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">Assistente SIPAER</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-600">
              {activeSection !== "seção atual" ? `Seção: ${activeSection}` : "Online"}
            </span>
          </div>
        </div>

        {/* Seletor de modelo */}
        <div className="relative" ref={modelRef}>
          <button
            onClick={() => setShowModelMenu((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-accent px-2.5 py-1.5 rounded-full transition-colors"
          >
            {currentModel.name}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showModelMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onModelChange(m.id); setShowModelMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                >
                  {m.id === model && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  <span className={cn("flex-1", m.id !== model && "pl-5")}>{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Mensagens / Estado vazio ────────────────────────────────────────── */}
      {hasMessages ? (
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="px-4 py-4 space-y-5">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onInsert={editor ? handleInsert : undefined}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-4 space-y-5">

            {/* Boas-vindas */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Como posso ajudar?</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Especializado em normas SIPAER · NSCA 3-13 · RBAC 137 · Anexo 13 ICAO · SHELL · HFACS
                </p>
              </div>
            </div>

            {/* Sugestão baseada na seção ativa */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3 text-amber-500" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Baseado na seção atual
                </p>
              </div>
              <button
                onClick={() => handleQuickAction(
                  (s) => `Pode ajudar a melhorar a análise da seção "${s}"? Identifique pontos fracos e sugira melhorias técnicas conforme NSCA 3-13.`
                )}
                className="w-full text-left p-3.5 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors group"
              >
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Sugestão inteligente</p>
                <p className="text-sm leading-relaxed">
                  Pode ajudar a melhorar a análise da{" "}
                  <span className="font-semibold text-primary">seção "{activeSection}"</span>?
                </p>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Clique para analisar terminologia, estrutura e fatores humanos
                </p>
              </button>
            </div>

            {/* Ações rápidas */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Zap className="w-3 h-3 text-primary" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ações Rápidas
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-background hover:bg-accent/50 hover:border-border/80 transition-all text-left"
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", action.bg)}>
                      <action.icon className={cn("w-3.5 h-3.5", action.color)} />
                    </div>
                    <span className="text-xs font-medium leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
      )}

      {/* ── Área de input ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-3 pt-2">
        <div className="relative flex flex-col rounded-2xl border border-border bg-background focus-within:ring-1 focus-within:ring-ring transition-shadow">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
            onKeyDown={handleKeyDown}
            placeholder={`Pergunte sobre a seção "${activeSection}"…`}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none"
            style={{ maxHeight: 160 }}
          />

          <div className="flex items-center gap-1.5 px-3 pb-2.5">
            <div className="flex-1" />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              title="Enviar (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Verifique informações críticas nas fontes oficiais CENIPA/FAB.
        </p>
      </div>
    </aside>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onInsert,
}: {
  message: AIMessage;
  onInsert?: (content: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Fontes */}
        {!isUser && !message.isLoading && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {message.sources.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Inserir no editor */}
        {!isUser && !message.isLoading && message.content && onInsert && (
          <button
            onClick={() => onInsert(message.content)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-1 py-0.5"
          >
            <ClipboardPaste className="w-3 h-3" />
            Inserir no editor
          </button>
        )}
      </div>
    </div>
  );
}
