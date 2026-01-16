"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Highlight } from "@tiptap/extension-highlight";
import {
  Save,
  Upload,
  Plus,
  Download,
  FileEdit,
  Columns,
  Eye,
  Code2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditorToolbar } from "./EditorToolbar";
import type { ReportSubsection } from "@/types/report";

interface ReportEditorProps {
  subsection: ReportSubsection | null;
  onContentChange: (content: string) => void;
  isSaved: boolean;
  onSave: () => void;
}

export function ReportEditor({
  subsection,
  onContentChange,
  isSaved,
  onSave,
}: ReportEditorProps) {
  const [activeTab, setActiveTab] = useState("editor");
  const [markdownContent, setMarkdownContent] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder:
          "Digite / para acessar comandos rápidos e inserir diferentes tipos de blocos.",
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: subsection?.content || "",
    editorProps: {
      attributes: {
        class: "tiptap prose prose-invert max-w-none focus:outline-none p-4",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);

      // Update markdown preview
      const text = editor.getText();
      setMarkdownContent(html);
    },
  });

  // Update editor content when subsection changes
  useEffect(() => {
    if (editor && subsection?.content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== subsection.content) {
        editor.commands.setContent(subsection.content || "");
      }
    }
  }, [editor, subsection?.content, subsection?.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    },
    [onSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex-1 flex flex-col bg-card min-w-0 h-full overflow-hidden">
      {/* Header do Editor */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Editor de Relatório</h1>
          <Badge variant={isSaved ? "secondary" : "destructive"} className="text-xs">
            {isSaved ? "Salvo" : "Não salvo"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Importar Dédalo
          </Button>
          <Button variant="default" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Template
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                Exportar PDF (Português)
              </DropdownMenuItem>
              <DropdownMenuItem>
                Exportar PDF (Inglês)
              </DropdownMenuItem>
              <DropdownMenuItem>
                Exportar PDF (Espanhol)
              </DropdownMenuItem>
              <DropdownMenuItem>
                Exportar Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs de Visualização */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger
              value="editor"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2"
            >
              <FileEdit className="w-4 h-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger
              value="split"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2"
            >
              <Columns className="w-4 h-4" />
              Lado a Lado
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="markdown"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2"
            >
              <Code2 className="w-4 h-4" />
              Markdown
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Conteúdo das Tabs */}
        <TabsContent value="editor" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
          <EditorToolbar editor={editor} />
          <ScrollArea className="flex-1 min-h-0">
            <div className="max-w-4xl mx-auto py-6 px-4">
              <EditorContent editor={editor} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="split" className="flex-1 m-0 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0">
            <div className="flex-1 flex flex-col border-r border-border min-h-0 overflow-hidden">
              <EditorToolbar editor={editor} />
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4">
                  <EditorContent editor={editor} />
                </div>
              </ScrollArea>
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-muted/30 shrink-0">
                <span className="text-sm text-muted-foreground">Preview</span>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div
                  className="p-4 prose prose-invert max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: editor?.getHTML() || "",
                  }}
                />
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto py-6 px-4">
              <div
                className="prose prose-invert max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: editor?.getHTML() || "",
                }}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="markdown" className="flex-1 m-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto py-6 px-4">
              <pre className="font-mono text-sm bg-muted/30 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {editor?.getHTML() || ""}
              </pre>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
