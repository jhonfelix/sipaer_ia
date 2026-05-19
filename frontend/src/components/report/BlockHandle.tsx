"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { Fragment } from "@tiptap/pm/model";
import {
  GripVertical, ChevronRight, ArrowUp, ArrowDown,
  Plus, Type, Link, CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Submenu = "move" | "insert" | "style" | null;

interface HandleState {
  top: number;
  left: number;
  nodePos: number;
  nodeSize: number;
}

const BLOCK_TYPES = [
  { label: "Parágrafo", command: "paragraph" },
  { label: "Título 1", command: "h1" },
  { label: "Título 2", command: "h2" },
  { label: "Título 3", command: "h3" },
  { label: "Citação", command: "blockquote" },
  { label: "Lista", command: "bulletList" },
  { label: "Lista numerada", command: "orderedList" },
  { label: "Lista de tarefas", command: "taskList" },
  { label: "Bloco de código", command: "codeBlock" },
];

// ── helpers ────────────────────────────────────────────────────────────────

function topLevelPosFrom(editor: Editor): { nodePos: number; idx: number } | null {
  const { $anchor } = editor.state.selection;
  let depth = $anchor.depth;
  while (depth > 1) depth--;
  if (depth < 1) return null;
  return {
    nodePos: $anchor.before(depth),
    idx: $anchor.index(0),
  };
}

function idxFromPos(editor: Editor, nodePos: number): number {
  const $pos = editor.state.doc.resolve(nodePos + 1);
  return $pos.index(0);
}

function prevSiblingPos(editor: Editor, idx: number): number {
  let pos = 0;
  for (let i = 0; i < idx - 1; i++) pos += editor.state.doc.child(i).nodeSize;
  return pos;
}

// ── component ──────────────────────────────────────────────────────────────

export function BlockHandle({ editor }: { editor: Editor }) {
  const [handle, setHandle] = useState<HandleState | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<Submenu>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  const cancelHide = useCallback(() => clearTimeout(hideTimerRef.current), []);
  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = setTimeout(() => {
      setHandle(null);
      setMenuOpen(false);
      setActiveSubmenu(null);
    }, 500);
  }, [cancelHide]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setActiveSubmenu(null);
  }, []);

  // Track hovered block
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        if (menuOpen) return;
        const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
        if (!result) { scheduleHide(); return; }

        const pos = result.inside >= 0 ? result.inside : result.pos;
        const $pos = editor.state.doc.resolve(pos);
        let depth = $pos.depth;
        while (depth > 1) depth--;
        if (depth < 1) { scheduleHide(); return; }

        const nodePos = $pos.before(depth);
        const node = editor.state.doc.nodeAt(nodePos);
        if (!node || node.type.name === "sectionDivider") { scheduleHide(); return; }

        const domNode = editor.view.nodeDOM(nodePos) as HTMLElement | null;
        const rect = domNode?.getBoundingClientRect();
        if (!rect) { scheduleHide(); return; }

        cancelHide();
        setHandle({ top: rect.top, left: rect.left, nodePos, nodeSize: node.nodeSize });
      });
    };
    dom.addEventListener("mousemove", onMouseMove);
    dom.addEventListener("mouseleave", scheduleHide);
    return () => {
      dom.removeEventListener("mousemove", onMouseMove);
      dom.removeEventListener("mouseleave", scheduleHide);
      cancelAnimationFrame(frameRef.current);
      clearTimeout(hideTimerRef.current);
    };
  }, [editor, menuOpen, cancelHide, scheduleHide]);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen, closeMenu]);

  // Move block logic
  const doMoveUp = useCallback((nodePos: number) => {
    const { state, view } = editor;
    const node = state.doc.nodeAt(nodePos);
    if (!node) return;
    const idx = idxFromPos(editor, nodePos);
    if (idx === 0) return;
    const prevPos = prevSiblingPos(editor, idx);
    const prevNode = state.doc.child(idx - 1);
    view.dispatch(
      state.tr.replaceWith(prevPos, prevPos + prevNode.nodeSize + node.nodeSize,
        Fragment.from([node, prevNode])
      )
    );
  }, [editor]);

  const doMoveDown = useCallback((nodePos: number) => {
    const { state, view } = editor;
    const node = state.doc.nodeAt(nodePos);
    if (!node) return;
    const nextNode = state.doc.nodeAt(nodePos + node.nodeSize);
    if (!nextNode) return;
    view.dispatch(
      state.tr.replaceWith(nodePos, nodePos + node.nodeSize + nextNode.nodeSize,
        Fragment.from([nextNode, node])
      )
    );
  }, [editor]);

  const moveUp = useCallback(() => {
    if (handle) doMoveUp(handle.nodePos);
    closeMenu();
  }, [handle, doMoveUp, closeMenu]);

  const moveDown = useCallback(() => {
    if (handle) doMoveDown(handle.nodePos);
    closeMenu();
  }, [handle, doMoveDown, closeMenu]);

  // Keyboard shortcuts: Alt+↑/↓
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const info = topLevelPosFrom(editor);
      if (!info) return;
      if (e.key === "ArrowUp") doMoveUp(info.nodePos);
      else doMoveDown(info.nodePos);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editor, doMoveUp, doMoveDown]);

  // Insert helpers
  const insertAbove = useCallback(() => {
    if (!handle) return;
    editor.chain().focus().insertContentAt(handle.nodePos, { type: "paragraph" }).run();
    closeMenu();
    setHandle(null);
  }, [editor, handle, closeMenu]);

  const insertBelow = useCallback(() => {
    if (!handle) return;
    editor.chain().focus().insertContentAt(handle.nodePos + handle.nodeSize, { type: "paragraph" }).run();
    closeMenu();
    setHandle(null);
  }, [editor, handle, closeMenu]);

  // Transform block type
  const transformBlock = useCallback((command: string) => {
    if (!handle) return;
    editor.chain().focus().setTextSelection(handle.nodePos + 1).run();
    switch (command) {
      case "paragraph": editor.chain().focus().setParagraph().run(); break;
      case "h1": editor.chain().focus().setNode("heading", { level: 1 }).run(); break;
      case "h2": editor.chain().focus().setNode("heading", { level: 2 }).run(); break;
      case "h3": editor.chain().focus().setNode("heading", { level: 3 }).run(); break;
      case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
      case "bulletList": editor.chain().focus().toggleBulletList().run(); break;
      case "orderedList": editor.chain().focus().toggleOrderedList().run(); break;
      case "taskList": editor.chain().focus().toggleTaskList().run(); break;
      case "codeBlock": editor.chain().focus().toggleCodeBlock().run(); break;
    }
    closeMenu();
  }, [editor, handle, closeMenu]);

  if (!handle || !editor.isEditable || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="bh"
      style={{ top: handle.top, left: handle.left }}
      onMouseEnter={cancelHide}
      onMouseLeave={() => { if (!menuOpen) scheduleHide(); }}
    >
      <button
        className={cn("bh-grip", menuOpen && "bh-grip--active")}
        onMouseDown={(e) => {
          e.preventDefault();
          if (menuOpen) closeMenu();
          else { setMenuOpen(true); setActiveSubmenu(null); }
        }}
        title="Opções do bloco"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {menuOpen && (
        <div ref={menuRef} className="bh-menu" onMouseLeave={() => setActiveSubmenu(null)}>

          {/* Paragraph style */}
          <div className="bh-parent" onMouseEnter={() => setActiveSubmenu("style")}>
            <div className={cn("bh-item", activeSubmenu === "style" && "bh-item--hover")}>
              <Type className="bh-icon" />
              <span>Estilo de parágrafo</span>
              <ChevronRight className="bh-chevron" />
            </div>
            {activeSubmenu === "style" && (
              <div className="bh-submenu">
                {BLOCK_TYPES.map((bt) => (
                  <button key={bt.command} className="bh-item"
                    onMouseDown={(e) => { e.preventDefault(); transformBlock(bt.command); }}>
                    {bt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Move line */}
          <div className="bh-parent" onMouseEnter={() => setActiveSubmenu("move")}>
            <div className={cn("bh-item", activeSubmenu === "move" && "bh-item--hover")}>
              <ArrowUp className="bh-icon" />
              <span>Mover linha</span>
              <ChevronRight className="bh-chevron" />
            </div>
            {activeSubmenu === "move" && (
              <div className="bh-submenu">
                <button className="bh-item" onMouseDown={(e) => { e.preventDefault(); moveUp(); }}>
                  <ArrowUp className="bh-icon" />
                  <span>Mover para cima</span>
                  <kbd className="bh-kbd">Alt ↑</kbd>
                </button>
                <button className="bh-item" onMouseDown={(e) => { e.preventDefault(); moveDown(); }}>
                  <ArrowDown className="bh-icon" />
                  <span>Mover para baixo</span>
                  <kbd className="bh-kbd">Alt ↓</kbd>
                </button>
              </div>
            )}
          </div>

          {/* Insert line */}
          <div className="bh-parent" onMouseEnter={() => setActiveSubmenu("insert")}>
            <div className={cn("bh-item", activeSubmenu === "insert" && "bh-item--hover")}>
              <Plus className="bh-icon" />
              <span>Inserir linha</span>
              <ChevronRight className="bh-chevron" />
            </div>
            {activeSubmenu === "insert" && (
              <div className="bh-submenu">
                <button className="bh-item" onMouseDown={(e) => { e.preventDefault(); insertAbove(); }}>
                  Acima
                </button>
                <button className="bh-item" onMouseDown={(e) => { e.preventDefault(); insertBelow(); }}>
                  Abaixo
                </button>
              </div>
            )}
          </div>

          <div className="bh-sep" />

          {/* Go to block */}
          <button className="bh-item"
            onMouseEnter={() => setActiveSubmenu(null)}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().setTextSelection(handle.nodePos + 1).run();
              closeMenu();
            }}>
            <CornerDownLeft className="bh-icon" />
            <span>Ir para o bloco</span>
          </button>

          {/* Copy link */}
          <button className="bh-item"
            onMouseEnter={() => setActiveSubmenu(null)}
            onMouseDown={(e) => {
              e.preventDefault();
              navigator.clipboard.writeText(`${window.location.href}#pos-${handle.nodePos}`).catch(() => {});
              closeMenu();
            }}>
            <Link className="bh-icon" />
            <span>Copiar link</span>
          </button>

        </div>
      )}
    </div>,
    document.body
  );
}
