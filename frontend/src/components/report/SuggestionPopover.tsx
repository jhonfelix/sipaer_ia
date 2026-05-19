"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InlineSuggestion } from "./extensions/SuggestionDecorations";

interface SuggestionPopoverProps {
  suggestion: InlineSuggestion | null;
  anchorRect: DOMRect | null;
  onAccept: (suggestion: InlineSuggestion) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

const typeLabels: Record<InlineSuggestion["type"], string> = {
  grammar: "Gramática",
  clarity: "Clareza",
  style: "Estilo",
};

const typeColors: Record<InlineSuggestion["type"], string> = {
  grammar: "text-red-400",
  clarity: "text-blue-400",
  style: "text-orange-400",
};

export function SuggestionPopover({
  suggestion,
  anchorRect,
  onAccept,
  onDismiss,
  onClose,
}: SuggestionPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchorRect || !ref.current) return;
    const el = ref.current;
    el.style.top = `${anchorRect.bottom + window.scrollY + 8}px`;
    el.style.left = `${anchorRect.left + window.scrollX}px`;
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (!suggestion || !anchorRect) return null;

  return createPortal(
    <div
      ref={ref}
      className="suggestion-popover"
      style={{ position: "absolute", zIndex: 9999 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb className={cn("w-3.5 h-3.5", typeColors[suggestion.type])} />
          <span className={cn("text-xs font-semibold", typeColors[suggestion.type])}>
            {typeLabels[suggestion.type]}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{suggestion.message}</p>
      {suggestion.fix && (
        <div className="bg-muted/50 rounded px-2 py-1.5 mb-3 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Sugestão:</p>
          <p className="text-xs font-medium">{suggestion.fix}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-7 text-xs flex-1 gap-1"
          onClick={() => onAccept(suggestion)}
        >
          <CheckCircle2 className="w-3 h-3" />
          Aceitar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={() => onDismiss(suggestion.id)}
        >
          Ignorar
        </Button>
      </div>
    </div>,
    document.body
  );
}
