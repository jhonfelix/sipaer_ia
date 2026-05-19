"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User2 } from "lucide-react";
import { chat as chatApi } from "@/lib/api";
import type { AIMessage } from "@/types/report";

export default function ChatPage() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi
      .history({ limit: 50 })
      .then(setMessages)
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const reply = await chatApi.send({ message: text });
      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, reply]);
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id
            ? { ...m, content: m.content + "\n\n*(Erro ao enviar. Tente novamente.)*" }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">Bate-papo com IA</h1>
            <p className="text-white/35 text-xs">Assistente SIPAER</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
              <Bot className="w-7 h-7 text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-white/60 font-medium">Como posso ajudar?</p>
              <p className="text-white/30 text-sm max-w-xs">
                Faça perguntas sobre investigação aeronáutica, solicite rascunhos de
                relatórios ou analise ocorrências.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === "user"
                  ? "bg-blue-600/20 border border-blue-500/30"
                  : "bg-white/[0.07] border border-white/[0.1]"
              }`}
            >
              {msg.role === "user" ? (
                <User2 className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-white/50" />
              )}
            </div>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600/20 text-white/90 border border-blue-500/20 rounded-tr-sm"
                  : "bg-white/[0.04] text-white/80 border border-white/[0.07] rounded-tl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white/50" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.07]">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.07] p-4">
        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all resize-none"
            style={{ minHeight: "44px", maxHeight: "140px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="h-[44px] w-[44px] flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-white/20 text-xs mt-2 text-center">
          A IA pode cometer erros. Verifique informações críticas nas fontes originais.
        </p>
      </div>
    </div>
  );
}
