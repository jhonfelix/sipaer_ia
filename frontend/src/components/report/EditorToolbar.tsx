"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Table, Minus, Link,
  Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, AlertCircle, Columns, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TEXT_COLORS = [
  { label: "Padrão", value: null },
  { label: "Vermelho", value: "#ef4444" },
  { label: "Laranja", value: "#f97316" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Verde", value: "#22c55e" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Roxo", value: "#a855f7" },
  { label: "Cinza", value: "#6b7280" },
];

interface EditorToolbarProps {
  editor: Editor | null;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={cn("h-8 w-8 p-0", isActive && "bg-accent text-accent-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [colorOpen, setColorOpen] = useState(false);

  if (!editor) return null;

  const currentColor = editor.getAttributes("textStyle").color as string | undefined;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 p-1 border-b border-border bg-card/50 flex-wrap">

        {/* Histórico */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} tooltip="Desfazer">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} tooltip="Refazer">
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formatação de texto */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")} tooltip="Negrito (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")} tooltip="Itálico (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")} tooltip="Sublinhado (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")} tooltip="Tachado">
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")} tooltip="Código inline">
          <Code className="w-4 h-4" />
        </ToolbarButton>

        {/* Cor do texto */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                  <Palette className="w-4 h-4" />
                  {currentColor && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
                      style={{ background: currentColor }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Cor do texto</p>
                <div className="grid grid-cols-4 gap-1">
                  {TEXT_COLORS.map(({ label, value }) => (
                    <button
                      key={label}
                      title={label}
                      onClick={() => {
                        if (value) {
                          editor.chain().focus().setColor(value).run();
                        } else {
                          editor.chain().focus().unsetColor().run();
                        }
                        setColorOpen(false);
                      }}
                      className={cn(
                        "w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-bold transition-all",
                        currentColor === value
                          ? "border-primary scale-110"
                          : "border-border hover:border-primary/50"
                      )}
                      style={{ background: value ?? "transparent", color: value ?? "var(--foreground)" }}
                    >
                      {!value && "A"}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Cor do texto</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })} tooltip="Título 1">
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })} tooltip="Título 2">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })} tooltip="Título 3">
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alinhamento */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })} tooltip="Alinhar à esquerda">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })} tooltip="Centralizar">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })} tooltip="Alinhar à direita">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })} tooltip="Justificado">
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Listas */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")} tooltip="Lista com marcadores">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")} tooltip="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")} tooltip="Lista de tarefas">
          <ListChecks className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Blocos */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")} tooltip="Citação">
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent({
            type: "callout",
            attrs: { variant: "info" },
            content: [{ type: "paragraph" }],
          }).run()}
          isActive={editor.isActive("callout")}
          tooltip="Callout (nota)">
          <AlertCircle className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertContent({
            type: "columns",
            attrs: { count: 2 },
            content: [
              { type: "column", content: [{ type: "paragraph" }] },
              { type: "column", content: [{ type: "paragraph" }] },
            ],
          }).run()}
          tooltip="Layout em colunas">
          <Columns className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          tooltip="Inserir tabela">
          <Table className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          tooltip="Linha horizontal">
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Imagem */}
        <ToolbarButton
          onClick={() => {
            editor.chain().focus().insertContent({
              type: "imageBlock",
              attrs: { src: null, alt: "", align: "center" },
              content: [{ type: "paragraph" }],
            }).run();
          }}
          tooltip="Inserir imagem">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Links */}
        <ToolbarButton
          onClick={() => {
            const url = window.prompt("URL do link:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          isActive={editor.isActive("link")}
          tooltip="Inserir link">
          <Link className="w-4 h-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}
