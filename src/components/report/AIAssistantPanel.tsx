"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Globe,
  Lightbulb,
  FileText,
  Send,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AIMessage, AIQuickAction } from "@/types/report";

interface AIAssistantPanelProps {
  messages: AIMessage[];
  quickActions: AIQuickAction[];
  suggestedPrompts: string[];
  onSendMessage: (message: string) => void;
  onQuickAction: (action: AIQuickAction) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-4 h-4" />,
  Globe: <Globe className="w-4 h-4" />,
  Lightbulb: <Lightbulb className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
};

export function AIAssistantPanel({
  messages,
  quickActions,
  suggestedPrompts,
  onSendMessage,
  onQuickAction,
}: AIAssistantPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    onSendMessage(prompt);
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-sm">Assistente SIPAER</h2>
            <p className="text-xs text-muted-foreground">
              Especialista em relatórios técnicos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500">Online</span>
          </div>
          <Badge variant="outline" className="text-xs ml-auto">
            GPT-CENIPA v1.0
          </Badge>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-medium text-muted-foreground mb-3">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onQuickAction(action)}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-accent transition-colors text-left"
            >
              <span className="text-primary">{iconMap[action.icon]}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Baseado em casos similares
        </p>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "flex-1 rounded-lg p-3 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-2">
                          Fontes consultadas:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {message.sources.map((source, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] cursor-pointer hover:bg-accent"
                            >
                              {source}
                              <ExternalLink className="w-2.5 h-2.5 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Suggested Prompts */}
      {suggestedPrompts.length > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground mb-2">
            Pode ajudar a melhorar a análise da seção 2.1?
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta ou solicitação..."
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 bottom-2 h-7 w-7"
            disabled={!inputValue.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
