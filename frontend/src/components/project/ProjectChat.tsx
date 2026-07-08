"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User2 } from "lucide-react";
import { chat as chatApi } from "@/lib/api";
import type { AIMessage, ProjectScope } from "@/types/report";
import { MarkdownRenderer, ModelSelector } from "@/components/chat";

interface Props {
  projectId: number;
  scope: ProjectScope;
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ProjectChat({ projectId, scope, sessionId, onSessionCreated }: Props) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState("gpt-oss-120b");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Carrega o histórico ao trocar de conversa
  useEffect(() => {
    if (sessionId) {
      chatApi.history({ sessionId, projectId }).then(setMessages).catch(() => {});
    } else {
      setMessages([]);
    }
  }, [sessionId, projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

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
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const reply = await chatApi.send({
        message: text,
        project_id: projectId,
        session_id: sessionId ?? undefined,
        model,
        chat_type: scope,
      });

      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, reply]);

      if (reply.sessionId && reply.sessionId !== sessionId) {
        onSessionCreated(reply.sessionId);
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

  const hasMessages = messages.length > 0 || sending;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-400/18 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-foreground/80 text-sm font-medium">Nova conversa no projeto</p>
            <p className="text-muted-foreground/50 text-xs max-w-xs">
              As instruções e os arquivos deste projeto são usados automaticamente como contexto.
            </p>
          </div>
        )}

        {hasMessages && (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) =>
              msg.role === "user" ? (
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
                <div key={msg.id} className="flex gap-3">
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
                            {[...new Map(msg.sources.map((s) => [s.source, s])).values()].map((s, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-muted/30 border border-border/60 text-muted-foreground/60"
                              >
                                {s.source} · {Math.round(s.score * 100)}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

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

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-muted/30 border border-border focus-within:border-blue-500/30 focus-within:bg-muted/40 transition-all overflow-hidden">
            <div className="flex items-end gap-2 px-3 py-2.5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resize();
                }}
                onKeyDown={onKeyDown}
                placeholder="Pergunte algo neste projeto… (Enter para enviar · Shift+Enter nova linha)"
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
            <div className="flex items-center justify-between px-3 pb-2.5">
              <ModelSelector value={model} onChange={setModel} />
              <p className="text-muted-foreground/40 text-[10px]">
                A IA pode cometer erros — verifique informações críticas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
