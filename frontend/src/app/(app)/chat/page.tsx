"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Paperclip,
  Send,
  RotateCcw,
  Copy,
  Download,
  FileEdit,
  Bot,
  Sparkles,
  User2,
  Plus,
  FilePlus2,
  Scale,
  ImagePlus,
  Check,
  Upload,
} from "lucide-react";
import { chat as chatApi } from "@/lib/api";
import type { ChatSession } from "@/lib/api";
import type { AIMessage } from "@/types/report";
import {
  MarkdownRenderer,
  ModelSelector,
  AttachmentPreview,
  ConversationSidebar,
} from "@/components/chat";
import type { AttachedFile, Conversation } from "@/components/chat";

// ── Starter cards ─────────────────────────────────────────────────────────────

const STARTERS = [
  {
    icon: FilePlus2,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    title: "Criar documento",
    description: "Redija documentos oficiais.",
    prompt: "Crie o seguinte documento: ",
  },
  {
    icon: Scale,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    title: "Analisar legislações",
    description: "Interprete normas, regulamentos e legislações aeronáuticas",
    prompt: "Analise a seguinte legislação ou regulamento e explique seus pontos principais: ",
  },
  {
    icon: ImagePlus,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "Criar imagem",
    description: "Gere imagens e diagramas a partir de descrições",
    prompt: "Gere uma imagem com a seguinte descrição: ",
  },
];

// ── Message actions ───────────────────────────────────────────────────────────

function ActionBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border hover:border-border/80 text-muted-foreground/60 hover:text-foreground text-[11px] transition-all"
    >
      {children}
    </button>
  );
}

function MessageActions({
  content,
  onContinue,
  onTransform,
}: {
  content: string;
  onContinue: () => void;
  onTransform: () => void;
}) {
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
    a.download = `sipaer-ia-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
      <ActionBtn onClick={copy} title={copied ? "Copiado!" : "Copiar resposta"}>
        {copied ? (
          <><Check className="w-3 h-3" /><span>Copiado</span></>
        ) : (
          <><Copy className="w-3 h-3" /><span>Copiar</span></>
        )}
      </ActionBtn>
      <ActionBtn onClick={exportMd} title="Exportar como Markdown">
        <Download className="w-3 h-3" /><span>Exportar</span>
      </ActionBtn>
      <ActionBtn onClick={onTransform} title="Transformar em relatório">
        <FileEdit className="w-3 h-3" /><span>Relatório</span>
      </ActionBtn>
      <ActionBtn onClick={onContinue} title="Continuar geração">
        <RotateCcw className="w-3 h-3" /><span>Continuar</span>
      </ActionBtn>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACCEPTED = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "audio/*",
  "video/*",
].join(",");

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [attached, setAttached] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [model, setModel] = useState("gpt-oss-120b");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function sessionToConv(s: ChatSession): Conversation {
    return {
      id: s.sessionId,
      title: s.title,
      category: "all",
      preview: s.preview,
      updatedAt: s.updatedAt,
    };
  }

  // Load sessions list on mount
  useEffect(() => {
    chatApi
      .sessions()
      .then((sessions) => {
        setConversations(sessions.map(sessionToConv));
      })
      .catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Textarea auto-resize
  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  // File helpers
  function addFiles(files: FileList | File[]) {
    const next: AttachedFile[] = Array.from(files).map((file) => ({
      id: uid(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttached((prev) => [...prev, ...next]);
  }

  function removeFile(id: string) {
    setAttached((prev) => {
      const f = prev.find((a) => a.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((a) => a.id !== id);
    });
  }

  // Drag & drop
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  // Send
  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: AIMessage = {
      id: `u-${uid()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttached([]);
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const reply = await chatApi.send({
        message: text,
        session_id: activeSessionId ?? undefined,
        model,
      });

      const newSessionId = reply.sessionId ?? activeSessionId;

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMsg.id),
        userMsg,
        reply,
      ]);

      if (newSessionId) {
        const title = text.slice(0, 50) + (text.length > 50 ? "…" : "");
        const preview = reply.content.slice(0, 60) + (reply.content.length > 60 ? "…" : "");
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === newSessionId);
          if (exists) {
            return prev.map((c) =>
              c.id === newSessionId
                ? { ...c, preview, updatedAt: new Date() }
                : c
            );
          }
          return [
            {
              id: newSessionId,
              title,
              category: "all",
              preview,
              updatedAt: new Date(),
            },
            ...prev,
          ];
        });
        setActiveConvId(newSessionId);
        setActiveSessionId(newSessionId);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id
            ? { ...m, content: m.content + "\n\n*(Erro ao enviar — tente novamente.)*" }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function newConversation() {
    setMessages([]);
    setInput("");
    setAttached([]);
    setActiveConvId(null);
    setActiveSessionId(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function selectConversation(id: string) {
    setActiveConvId(id);
    setActiveSessionId(id);
    chatApi
      .history({ sessionId: id })
      .then(setMessages)
      .catch(() => {});
  }

  function continueFromMsg(content: string) {
    setInput("Continue a partir de: " + content.slice(-80) + "...");
    textareaRef.current?.focus();
  }

  function transformToReport(content: string) {
    router.push(`/reports/new?draft=${encodeURIComponent(content.slice(0, 500))}`);
  }

  const hasMessages = messages.length > 0 || sending;

  return (
    <div
      className="flex flex-1 h-full min-h-0 relative overflow-hidden"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/[0.08] border-2 border-dashed border-blue-500/40 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/25 flex items-center justify-center">
            <Upload className="w-7 h-7 text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-blue-700 dark:text-blue-300 font-semibold">Solte para anexar</p>
            <p className="text-blue-600/60 dark:text-blue-400/50 text-sm mt-1">PDF · DOCX · XLSX · CSV · imagens · áudio · vídeo</p>
          </div>
        </div>
      )}

      {/* Category + history panel */}
      <ConversationSidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        conversations={conversations}
        activeId={activeConvId}
        onSelect={selectConversation}
        onNew={newConversation}
      />

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-h-0 bg-background">

        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-800/25 border border-blue-400/18 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-foreground font-semibold text-[13px] leading-none">
                Workspace IA — SIPAER
              </h1>
              <p className="text-muted-foreground/50 text-[10px] mt-0.5 leading-none">
                Inteligência aeronáutica especializada · CENIPA / FAB
              </p>
            </div>
          </div>
          <button
            onClick={newConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground/60 hover:text-foreground text-xs font-medium transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova conversa
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
          {/* Empty state */}
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center h-full gap-8 py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-900/30 border border-blue-400/18 flex items-center justify-center shadow-2xl shadow-blue-900/25">
                    <Sparkles className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-blue-500/25 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
                  </div>
                </div>
                <div>
                  <h2 className="text-foreground font-semibold text-base tracking-tight">
                    Workspace de Inteligência Aeronáutica
                  </h2>
                  <p className="text-muted-foreground/50 text-sm mt-1">Como posso ajudar hoje?</p>
                </div>
              </div>

              {/* Starter cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 w-full max-w-2xl">
                {STARTERS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.title}
                      onClick={() => {
                        setInput(s.prompt);
                        setTimeout(() => textareaRef.current?.focus(), 50);
                      }}
                      className="flex flex-col gap-3 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/50 hover:border-border text-left transition-all"
                    >
                      <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <div>
                        <p className="text-foreground/80 text-[13px] font-semibold leading-tight">
                          {s.title}
                        </p>
                        <p className="text-muted-foreground/50 text-[11px] mt-0.5 leading-snug">
                          {s.description}
                        </p>
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
              {messages.map((msg) =>
                msg.role === "user" ? (
                  /* User message */
                  <div key={msg.id} className="flex justify-end">
                    <div className="flex items-end gap-2.5 max-w-[80%]">
                      <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-blue-600/20 border border-blue-500/20 text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-blue-600/18 border border-blue-500/22 flex items-center justify-center shrink-0 mb-0.5">
                        <User2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* AI message */
                  <div key={msg.id} className="flex gap-3 group/msg">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/15 to-blue-800/20 border border-blue-400/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl rounded-tl-sm bg-muted/25 border border-border/60 px-4 py-3.5">
                        <MarkdownRenderer content={msg.content} />
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest font-medium mb-1.5">
                              Fontes
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.sources.map((src, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted/30 border border-border/60 text-muted-foreground/60"
                                >
                                  {src}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <MessageActions
                        content={msg.content}
                        onContinue={() => continueFromMsg(msg.content)}
                        onTransform={() => transformToReport(msg.content)}
                      />
                    </div>
                  </div>
                )
              )}

              {/* Typing indicator */}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/15 to-blue-800/20 border border-blue-400/15 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-pulse" />
                  </div>
                  <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-muted/25 border border-border/60">
                    <span className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce"
                          style={{ animationDelay: `${i * 160}ms` }}
                        />
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
            <div className="rounded-2xl bg-muted/30 border border-border focus-within:border-blue-500/30 focus-within:bg-muted/40 transition-all overflow-hidden">

              {/* Attachment previews */}
              {attached.length > 0 && (
                <div className="px-3 pt-3">
                  <AttachmentPreview files={attached} onRemove={removeFile} />
                </div>
              )}

              {/* Textarea row */}
              <div className="flex items-end gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Anexar arquivo (PDF, DOCX, XLSX, CSV, imagem, áudio, vídeo)"
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border text-muted-foreground/50 hover:text-foreground transition-all shrink-0 mb-0.5"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); resize(); }}
                  onKeyDown={onKeyDown}
                  placeholder="Descreva o que precisa… (Enter para enviar · Shift+Enter nova linha)"
                  rows={1}
                  className="flex-1 bg-transparent text-foreground/90 placeholder:text-muted-foreground/40 text-sm leading-relaxed resize-none focus:outline-none py-1"
                  style={{ minHeight: "32px", maxHeight: "200px" }}
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-blue-600/20 shrink-0 mb-0.5"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 pb-2.5">
                <ModelSelector value={model} onChange={setModel} />
                <p className="text-muted-foreground/40 text-[10px]">
                  A IA pode cometer erros — verifique informações críticas nas fontes oficiais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
