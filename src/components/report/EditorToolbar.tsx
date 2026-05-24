"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Table,
  Minus,
  Link,
  Image,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0",
            isActive && "bg-accent text-accent-foreground"
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 p-1 border-b border-border bg-card/50 flex-wrap">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          tooltip="Desfazer"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          tooltip="Refazer"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formatação de texto */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          tooltip="Negrito (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          tooltip="Itálico (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          tooltip="Sublinhado (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          tooltip="Tachado"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          tooltip="Código"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          tooltip="Título 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          tooltip="Título 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          tooltip="Título 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Listas */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          tooltip="Lista com marcadores"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          tooltip="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList?.().run()}
          isActive={editor.isActive?.("taskList")}
          tooltip="Lista de tarefas"
          disabled
        >
          <ListChecks className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Blocos */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          tooltip="Citação"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          tooltip="Inserir tabela"
        >
          <Table className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          tooltip="Linha horizontal"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Links e Mídia */}
        <ToolbarButton
          onClick={() => {
            const url = window.prompt("URL do link:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          isActive={editor.isActive("link")}
          tooltip="Inserir link"
        >
          <Link className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            // Funcionalidade de imagem será implementada futuramente
            console.log("Inserir imagem - em desenvolvimento");
          }}
          tooltip="Inserir imagem (em breve)"
          disabled
        >
          <Image className="w-4 h-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}
