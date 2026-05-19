"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Sparkles,
  MessageSquarePlus,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BubbleMenuToolbarProps {
  editor: Editor;
  onAIAction: (action: string, selectedText: string) => void;
}

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
}

export function BubbleMenuToolbar({ editor, onAIAction }: BubbleMenuToolbarProps) {
  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const getSelectedText = useCallback(() => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  useEffect(() => {
    const showMenu = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || !editor.isFocused) {
        setMenu({ visible: false, x: 0, y: 0 });
        return;
      }

      clearTimeout(hideTimeoutRef.current);

      const startCoords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);
      const midX = (startCoords.left + endCoords.right) / 2;
      const topY = Math.min(startCoords.top, endCoords.top);

      setMenu({ visible: true, x: midX, y: topY });
    };

    const hideMenu = () => {
      // Delay so clicks inside menu still register
      hideTimeoutRef.current = setTimeout(() => {
        setMenu({ visible: false, x: 0, y: 0 });
      }, 150);
    };

    editor.on("selectionUpdate", showMenu);
    editor.on("blur", hideMenu);
    editor.on("focus", showMenu);

    return () => {
      editor.off("selectionUpdate", showMenu);
      editor.off("blur", hideMenu);
      editor.off("focus", showMenu);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [editor]);

  const keepMenuOpen = () => {
    clearTimeout(hideTimeoutRef.current);
  };

  const handleAction = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    keepMenuOpen();
    fn();
  };

  if (!menu.visible || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y - 8,
        transform: "translate(-50%, -100%)",
        zIndex: 9998,
      }}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={keepMenuOpen}
    >
      <div className="flex items-center gap-0.5 p-1 bg-popover border border-border rounded-lg shadow-lg">
        <button
          onMouseDown={handleAction(() => editor.chain().focus().toggleBold().run())}
          className={cn("h-7 w-7 flex items-center justify-center rounded hover:bg-accent", editor.isActive("bold") && "bg-accent")}
          title="Negrito"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={handleAction(() => editor.chain().focus().toggleItalic().run())}
          className={cn("h-7 w-7 flex items-center justify-center rounded hover:bg-accent", editor.isActive("italic") && "bg-accent")}
          title="Itálico"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={handleAction(() => editor.chain().focus().toggleUnderline().run())}
          className={cn("h-7 w-7 flex items-center justify-center rounded hover:bg-accent", editor.isActive("underline") && "bg-accent")}
          title="Sublinhado"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={handleAction(() => editor.chain().focus().toggleStrike().run())}
          className={cn("h-7 w-7 flex items-center justify-center rounded hover:bg-accent", editor.isActive("strike") && "bg-accent")}
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={handleAction(() => editor.chain().focus().toggleHighlight().run())}
          className={cn("h-7 w-7 flex items-center justify-center rounded hover:bg-accent", editor.isActive("highlight") && "bg-accent")}
          title="Destaque"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        <button
          onMouseDown={handleAction(() => onAIAction("rewrite", getSelectedText()))}
          className="h-7 px-2 flex items-center gap-1 text-xs text-primary rounded hover:bg-accent"
          title="Reescrever com IA"
        >
          <Sparkles className="w-3 h-3" />
          Reescrever
        </button>
        <button
          onMouseDown={handleAction(() => onAIAction("expand", getSelectedText()))}
          className="h-7 px-2 flex items-center gap-1 text-xs text-primary rounded hover:bg-accent"
          title="Expandir com IA"
        >
          <Sparkles className="w-3 h-3" />
          Expandir
        </button>
        <button
          onMouseDown={handleAction(() => onAIAction("comment", getSelectedText()))}
          className="h-7 px-2 flex items-center gap-1 text-xs rounded hover:bg-accent"
          title="Comentário"
        >
          <MessageSquarePlus className="w-3 h-3" />
        </button>
      </div>
    </div>,
    document.body
  );
}
