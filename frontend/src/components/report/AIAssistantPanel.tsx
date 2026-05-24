"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, X, Plus, Paperclip, ChevronDown,
  FileText, ImageIcon, Scale, Camera, ExternalLink,
  ClipboardPaste, Check, Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AIMessage, AIQuickAction } from "@/types/report";
import type { Editor } from "@tiptap/react";

// ── Modelos disponíveis ───────────────────────────────────────────────────────

const MODELS = [
  { id: "gpt-oss-20b",        label: "GPT OSS 20B"  },
  { id: "gemma4-4-26B-A4B-it", label: "Gemma4 26B — Multimodal" },
] as const;

// ── Chips de ação rápida ──────────────────────────────────────────────────────

const QUICK_CHIPS = [
  {
    id: "oficio",
    label: "Criar Ofício",
    icon: FileText,
    prompt:
      "Preciso criar um ofício oficial do CENIPA. Me ajude a elaborar o documento formal com cabeçalho, numeração e estrutura adequada para a FAB.",
  },
  {
    id: "imagem",
    label: "Gerar Imagem",
    icon: ImageIcon,
    prompt:
      "Preciso gerar uma imagem para uso em relatório aeronáutico SIPAER. Descreva o que você precisa e eu vou criar.",
  },
  {
    id: "normativos",
    label: "Analisar Normativos",
    icon: Scale,
    prompt:
      "Analise os normativos e legislação aeronáutica pertinentes (RBHA, RBAC, ICA, MCA). Qual é a sua dúvida?",
  },
];

// ── Opções de anexo ───────────────────────────────────────────────────────────

const ATTACH_OPTS = [
  {
    id: "file",
    icon: Paperclip,
    label: "Adicionar arquivos ou fotos",
    accept: "image/*,.pdf,.doc,.docx,.txt",
  },
  {
    id: "camera",
    icon: Camera,
    label: "Fazer captura de tela",
    accept: "",
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AIAssistantPanelProps {
  messages: AIMessage[];
  quickActions: AIQuickAction[];
  suggestedPrompts: string[];
  onSendMessage: (message: string) => void;
  onQuickAction: (action: AIQuickAction) => void;
  onClose?: () => void;
  editor?: Editor | null;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function AIAssistantPanel({
  messages,
  onSendMessage,
  onClose,
  editor,
}: AIAssistantPanelProps) {
  const [input,         setInput]         = useState("");
  const [model,         setModel]         = useState<string>(MODELS[0].id);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showAttach,    setShowAttach]    = useState(false);

  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const modelRef   = useRef<HTMLDivElement>(null);
  const attachRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const hasMessages = messages.length > 0;
  const currentModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Auto-scroll para o fim do chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node))
        setShowModelMenu(false);
      if (attachRef.current && !attachRef.current.contains(e.target as Node))
        setShowAttach(false);
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
    onSendMessage(text);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChip = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) autoResize(inputRef.current);
    }, 0);
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
            <span className="text-[10px] text-green-600">Online</span>
          </div>
        </div>

        {/* Seletor de modelo */}
        <div className="relative" ref={modelRef}>
          <button
            onClick={() => setShowModelMenu((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-accent px-2.5 py-1.5 rounded-full transition-colors"
          >
            {currentModel.label}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showModelMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setModel(m.id); setShowModelMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                >
                  {m.id === model && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  <span className={cn("flex-1", m.id !== model && "pl-5")}>{m.label}</span>
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

      {/* ── Mensagens ──────────────────────────────────────────────────────── */}
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
        /* ── Estado vazio ── */
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4 gap-3 select-none">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-base">Como posso ajudar?</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
              Assistente especializado em normas aeronáuticas, relatórios SIPAER e processos CENIPA/FAB.
            </p>
          </div>
        </div>
      )}

      {/* ── Área de input ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-3 pt-2 space-y-2">

        {/* Chips de ação rápida */}
        {!hasMessages && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => handleChip(chip.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent text-xs font-medium transition-colors"
              >
                <chip.icon className="w-3.5 h-3.5 text-muted-foreground" />
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Caixa de texto */}
        <div className="relative flex flex-col rounded-2xl border border-border bg-background focus-within:ring-1 focus-within:ring-ring transition-shadow">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
            onKeyDown={handleKeyDown}
            placeholder="Digite / para habilidades…"
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none"
            style={{ maxHeight: 160 }}
          />

          {/* Toolbar inferior */}
          <div className="flex items-center gap-1.5 px-3 pb-2.5">
            {/* Botão + anexo */}
            <div className="relative" ref={attachRef}>
              <button
                onClick={() => setShowAttach((v) => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                title="Adicionar"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Dropdown anexo */}
              {showAttach && (
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-popover border border-border rounded-xl shadow-xl py-1.5 z-50">
                  {ATTACH_OPTS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (opt.id === "file") fileRef.current?.click();
                        setShowAttach(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <opt.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      {opt.label}
                    </button>
                  ))}
                  <div className="h-px bg-border mx-2 my-1" />
                  <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Pesquisa
                  </p>
                  <button className="flex items-center justify-between w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      <span>Busca na web</span>
                    </div>
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={() => { /* TODO: upload anexo */ }}
            />

            <div className="flex-1" />

            {/* Botão enviar */}
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

        <p className="text-[10px] text-muted-foreground text-center">
          As respostas podem conter erros. Verifique informações críticas.
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
