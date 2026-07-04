"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import { Callout } from "./extensions/Callout";
import { Column, Columns as ColumnsNode } from "./extensions/Columns";
import { ImageBlock } from "./extensions/ImageBlock";
import {
  Save,
  Upload,
  Download,
  FileEdit,
  Columns,
  Eye,
  Code2,
  ChevronDown,
  MessageSquarePlus,
  Lightbulb,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EditorToolbar } from "./EditorToolbar";
import { BubbleMenuToolbar } from "./BubbleMenuToolbar";
import { BlockHandle } from "./BlockHandle";
import { SlashCommandPalette } from "./SlashCommandPalette";
import { SuggestionPopover } from "./SuggestionPopover";
import { SectionDivider } from "./extensions/SectionDivider";
import { SlashCommandExtension } from "./extensions/SlashCommand";
import type { SlashMenuState, SlashCommandItem } from "./extensions/SlashCommand";
import {
  SuggestionDecorations,
  generateMockSuggestions,
  acceptSuggestion,
  dismissSuggestion,
} from "./extensions/SuggestionDecorations";
import type { InlineSuggestion } from "./extensions/SuggestionDecorations";
import { useToast } from "@/hooks/use-toast";

// Lowlight instance for syntax highlighting
const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("python", python);
lowlight.register("sql", sql);
lowlight.register("bash", bash);

// Extend table nodes to preserve class attributes through TipTap's parse → serialize cycle
const classAttr = {
  default: null,
  parseHTML: (el: Element) => el.getAttribute("class"),
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs.class ? { class: attrs.class } : {},
};

const SipaerTable = Table.extend({
  addAttributes() { return { ...this.parent?.(), class: classAttr }; },
}).configure({ resizable: true });

const SipaerTableCell = TableCell.extend({
  addAttributes() { return { ...this.parent?.(), class: classAttr }; },
});

const SipaerTableHeader = TableHeader.extend({
  addAttributes() { return { ...this.parent?.(), class: classAttr }; },
});

export interface ReportEditorProps {
  reportId?: string;
  documentContent: string;
  onContentChange: (content: string) => void;
  onSubsectionVisible?: (subsectionId: string) => void;
  isSaved: boolean;
  onSave: () => void;
  onAIMessage?: (message: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ReportEditor({
  reportId,
  documentContent,
  onContentChange,
  onSubsectionVisible,
  isSaved,
  onSave,
  onAIMessage,
  scrollContainerRef,
}: ReportEditorProps) {
  const [activeTab, setActiveTab] = useState("editor");
  const [isDedaloModalOpen, setIsDedaloModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [dedaloCode, setDedaloCode] = useState("");
  const [lastSaved, setLastSaved] = useState<Date>();

  // Slash command state
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const slashMenuRef = useRef<SlashMenuState | null>(null);
  slashMenuRef.current = slashMenu;

  // Suggestion popover state
  const [activeSuggestion, setActiveSuggestion] = useState<InlineSuggestion | null>(null);
  const [suggestionRect, setSuggestionRect] = useState<DOMRect | null>(null);

  const { toast } = useToast();
  const suggestionsDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);
  const lastAppliedContent = useRef<string | null>(null);
  const pendingContentRef = useRef<string | null>(null);

  // Slash command extension (stable across renders)
  const slashCommandExtension = useMemo(
    () =>
      SlashCommandExtension.configure({
        onOpen: (state) => setSlashMenu(state),
        onUpdate: (items, command, clientRect) =>
          setSlashMenu((prev) =>
            prev ? { ...prev, items, command, clientRect } : null
          ),
        onClose: () => setSlashMenu(null),
        onAICommand: (action, text) => {
          if (!onAIMessage) return;
          const prompts: Record<string, string> = {
            improve: `Melhore o seguinte texto com maior precisão técnica SIPAER:\n\n"${text}"`,
            summarize: `Resuma o seguinte conteúdo mantendo os pontos essenciais:\n\n"${text}"`,
            sipaerReview: "Revise o relatório completo verificando conformidade com NSCA 3-13 e normas SIPAER.",
            fixGrammar: `Corrija os erros gramaticais do seguinte texto:\n\n"${text}"`,
          };
          if (prompts[action]) onAIMessage(prompts[action]);
        },
        onKeyDown: ({ event }) => {
          const menu = slashMenuRef.current;
          if (!menu) return false;

          if (event.key === "ArrowDown") {
            setSlashMenu((prev) =>
              prev
                ? {
                    ...prev,
                    selectedIndex: Math.min(
                      prev.selectedIndex + 1,
                      prev.items.length - 1
                    ),
                  }
                : null
            );
            return true;
          }
          if (event.key === "ArrowUp") {
            setSlashMenu((prev) =>
              prev
                ? {
                    ...prev,
                    selectedIndex: Math.max(prev.selectedIndex - 1, 0),
                  }
                : null
            );
            return true;
          }
          if (event.key === "Enter") {
            const current = slashMenuRef.current;
            if (current && current.items[current.selectedIndex]) {
              current.command(current.items[current.selectedIndex]);
              setSlashMenu(null);
            }
            return true;
          }
          if (event.key === "Escape") {
            setSlashMenu(null);
            return true;
          }
          return false;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onAIMessage]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // replaced by CodeBlockLowlight
      }),
      SectionDivider,
      Placeholder.configure({
        placeholder: "Digite / para acessar comandos rápidos e inserir diferentes tipos de blocos.",
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      SipaerTable,
      TableRow,
      SipaerTableCell,
      SipaerTableHeader,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Callout,
      Column,
      ColumnsNode,
      ImageBlock,
      Dropcursor.configure({ color: "#3b82f6", width: 2 }),
      Gapcursor,
      SuggestionDecorations,
      slashCommandExtension,
    ],
    content: documentContent || "<p></p>",
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none",
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement;
        if (target.classList.contains("suggestion-inline")) {
          const id = target.getAttribute("data-suggestion-id");
          const type = target.getAttribute("data-suggestion-type") as InlineSuggestion["type"];
          const message = target.getAttribute("data-suggestion-message") || "";
          const fix = target.getAttribute("data-suggestion-fix") || "";
          if (id) {
            setActiveSuggestion({ id, from: pos, to: pos, type, message, fix });
            setSuggestionRect(target.getBoundingClientRect());
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);

      clearTimeout(suggestionsDebounce.current);
      suggestionsDebounce.current = setTimeout(() => {
        generateMockSuggestions(editor);
      }, 2000);
    },
  });

  // Aplica documentContent ao editor: na montagem, e depois sempre que mudar
  // externamente (ex.: geração de relatório com IA concluída via polling).
  // Enquanto o usuário está digitando (editor focado), a atualização fica
  // pendente e só é aplicada quando o editor perder o foco, para não
  // sobrescrever uma edição em andamento.
  useEffect(() => {
    if (!editor || !documentContent) return;
    if (documentContent === lastAppliedContent.current) return;

    const apply = () => {
      lastAppliedContent.current = documentContent;
      pendingContentRef.current = null;
      editor.commands.setContent(documentContent);
    };

    if (isFirstMount.current) {
      isFirstMount.current = false;
      apply();
      return;
    }

    if (editor.isFocused) {
      pendingContentRef.current = documentContent;
    } else {
      apply();
    }
  }, [editor, documentContent]);

  // Aplica conteúdo pendente assim que o editor perder o foco
  useEffect(() => {
    if (!editor) return;
    const onBlur = () => {
      if (pendingContentRef.current && pendingContentRef.current !== lastAppliedContent.current) {
        const content = pendingContentRef.current;
        lastAppliedContent.current = content;
        pendingContentRef.current = null;
        editor.commands.setContent(content);
      }
    };
    editor.on("blur", onBlur);
    return () => {
      editor.off("blur", onBlur);
    };
  }, [editor]);

  // Sync reportId into ImageBlock extension storage so ImageBlockView can read it
  useEffect(() => {
    if (editor && reportId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.storage as any).imageBlock.reportId = reportId;
    }
  }, [editor, reportId]);

  // File drop on editor → insert ImageBlock
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;

    const onDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files[0];
      if (!file?.type.startsWith("image/")) return;
      e.preventDefault();
      e.stopPropagation();
      const url = URL.createObjectURL(file);
      const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      const pos = result?.pos ?? editor.state.selection.anchor;
      editor.chain().focus().insertContentAt(pos, {
        type: "imageBlock",
        attrs: { src: url, alt: file.name.replace(/\.[^/.]+$/, "") },
        content: [{ type: "paragraph" }],
      }).run();
    };

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };

    dom.addEventListener("drop", onDrop);
    dom.addEventListener("dragover", onDragOver);
    return () => {
      dom.removeEventListener("drop", onDrop);
      dom.removeEventListener("dragover", onDragOver);
    };
  }, [editor]);

  // Scroll spy via scroll event
  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container || !onSubsectionVisible) return;

    const viewport = container.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;

    const handleScroll = () => {
      const anchors = viewport.querySelectorAll("[data-subsection-id]");
      let currentId: string | null = null;
      const containerTop = viewport.getBoundingClientRect().top;

      for (const anchor of anchors) {
        const rect = anchor.getBoundingClientRect();
        if (rect.top - containerTop <= 120) {
          currentId = anchor.getAttribute("data-subsection-id");
        } else {
          break;
        }
      }

      if (currentId) onSubsectionVisible(currentId);
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [editor, onSubsectionVisible, scrollContainerRef]);

  const handleSave = useCallback(() => {
    onSave();
    setLastSaved(new Date());
    toast({ description: "Informações salvas com sucesso", variant: "success" });
  }, [onSave, toast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleAIAction = useCallback(
    (action: string, selectedText: string) => {
      if (!editor) return;

      const prompts: Record<string, string> = {
        rewrite: `Reescreva o seguinte texto de forma mais técnica e precisa para um relatório SIPAER:\n\n"${selectedText}"`,
        expand: `Expanda o seguinte trecho com mais detalhes técnicos para o relatório:\n\n"${selectedText}"`,
        shorten: `Resuma o seguinte texto mantendo os pontos essenciais:\n\n"${selectedText}"`,
        comment: `Analisando: "${selectedText}"`,
      };

      if (action === "comment") {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          editor.chain().focus().setHighlight({ color: "#fef08a" }).run();
          toast({ description: "Trecho destacado como comentário", variant: "success" });
        }
        return;
      }

      if (onAIMessage && prompts[action]) {
        onAIMessage(prompts[action]);
        toast({ description: "Solicitação enviada ao assistente IA", variant: "info" });
      }
    },
    [editor, onAIMessage, toast]
  );

  const handleSlashSelect = useCallback(
    (item: SlashCommandItem) => {
      if (slashMenu) {
        slashMenu.command(item);
        setSlashMenu(null);
      }
    },
    [slashMenu]
  );

  const handleImportDedalo = useCallback(() => {
    if (!dedaloCode.trim()) {
      toast({ title: "Campo obrigatório", description: "Por favor, insira o código da ocorrência.", variant: "destructive" });
      return;
    }
    setIsDedaloModalOpen(false);
    setDedaloCode("");
    toast({ title: "Importação iniciada", description: `Buscando dados da ocorrência ${dedaloCode} no sistema Dédalo...`, variant: "info" });
  }, [dedaloCode, toast]);

  const handleAddComment = useCallback(() => {
    if (!editor || !commentText.trim()) {
      toast({ title: "Campo obrigatório", description: "Por favor, digite um comentário.", variant: "destructive" });
      return;
    }
    editor.chain().focus().setHighlight({ color: "#fef08a" }).run();
    setIsCommentModalOpen(false);
    setCommentText("");
    toast({ title: "Comentário adicionado", description: "O trecho foi destacado com seu comentário.", variant: "success" });
  }, [editor, commentText, toast]);

  const handleOpenCommentModal = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      toast({ title: "Nenhum texto selecionado", description: "Selecione um trecho do texto para adicionar um comentário.", variant: "warning" });
      return;
    }
    setIsCommentModalOpen(true);
  }, [editor, toast]);

  return (
    <div ref={editorWrapperRef} className="flex-1 flex flex-col bg-card min-w-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Editor de Relatório</h1>
          <Badge
            variant={isSaved ? "secondary" : "destructive"}
            className={isSaved && lastSaved ? "text-xs text-green-600" : "text-xs"}
          >
            {isSaved && lastSaved
              ? `Salvo às ${lastSaved.toLocaleTimeString()}`
              : "Não salvo"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar
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
              <DropdownMenuItem>Exportar PDF (Português)</DropdownMenuItem>
              <DropdownMenuItem>Exportar PDF (Inglês)</DropdownMenuItem>
              <DropdownMenuItem>Exportar PDF (Espanhol)</DropdownMenuItem>
              <DropdownMenuItem>Exportar Markdown</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="h-10 bg-transparent p-0 gap-4">
            <TabsTrigger value="editor" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2">
              <FileEdit className="w-4 h-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="split" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2">
              <Columns className="w-4 h-4" />
              Lado a Lado
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="markdown" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 gap-2">
              <Code2 className="w-4 h-4" />
              Markdown
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Editor Tab */}
        <TabsContent value="editor" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden relative">
          <EditorToolbar editor={editor} />

          {editor && (
            <BubbleMenuToolbar editor={editor} onAIAction={handleAIAction} />
          )}
          {editor && <BlockHandle editor={editor} />}

          <ScrollArea className="flex-1 min-h-0">
            <div className="tiptap-document-wrapper">
              <EditorContent editor={editor} />
            </div>
          </ScrollArea>

          {/* Slash command palette */}
          <SlashCommandPalette
            menu={slashMenu}
            onSelect={handleSlashSelect}
            onIndexChange={(index) =>
              setSlashMenu((prev) => (prev ? { ...prev, selectedIndex: index } : null))
            }
          />

          {/* Suggestion popover */}
          <SuggestionPopover
            suggestion={activeSuggestion}
            anchorRect={suggestionRect}
            onAccept={(s) => {
              if (editor) acceptSuggestion(editor, s);
              setActiveSuggestion(null);
              setSuggestionRect(null);
            }}
            onDismiss={(id) => {
              if (editor) dismissSuggestion(editor, id);
              setActiveSuggestion(null);
              setSuggestionRect(null);
            }}
            onClose={() => {
              setActiveSuggestion(null);
              setSuggestionRect(null);
            }}
          />

          {/* Floating comment button */}
          <Button
            onClick={handleOpenCommentModal}
            size="icon"
            className="absolute top-14 right-4 h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-10"
            title="Adicionar comentário ao texto selecionado"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>

          {/* Suggestion hint indicator 
          <div className="absolute bottom-4 right-16 flex items-center gap-2 text-[10px] text-muted-foreground/60 pointer-events-none select-none">
            <Lightbulb className="w-3 h-3" />
            Sugestões IA ativas
          </div>
          */}
        </TabsContent>

        {/* Split Tab */}
        <TabsContent value="split" className="flex-1 m-0 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0">
            <div className="flex-1 flex flex-col border-r border-border min-h-0 overflow-hidden">
              <EditorToolbar editor={editor} />
              <ScrollArea className="flex-1 min-h-0">
                <div className="tiptap-document-wrapper">
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
                  className="p-4 prose max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
                />
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 m-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto py-6 px-4">
              <div
                className="prose max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Markdown Tab */}
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

      {/* Dédalo Modal */}
      <Dialog open={isDedaloModalOpen} onOpenChange={setIsDedaloModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar do Dédalo
            </DialogTitle>
            <DialogDescription>
              Insira o código da ocorrência para importar os dados do sistema Dédalo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dedaloCode">Código da Ocorrência</Label>
              <Input id="dedaloCode" placeholder="Ex: A-092/CENIPA/2024" value={dedaloCode} onChange={(e) => setDedaloCode(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDedaloModalOpen(false); setDedaloCode(""); }}>Cancelar</Button>
            <Button onClick={handleImportDedalo}>
              <Upload className="h-4 w-4 mr-2" /> Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Modal */}
      <Dialog open={isCommentModalOpen} onOpenChange={setIsCommentModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Adicionar Comentário
            </DialogTitle>
            <DialogDescription>
              Adicione um comentário ao trecho de texto selecionado. O texto será destacado em amarelo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="commentText">Comentário</Label>
              <Textarea id="commentText" placeholder="Digite seu comentário sobre o trecho selecionado..." value={commentText} onChange={(e) => setCommentText(e.target.value)} className="min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCommentModalOpen(false); setCommentText(""); }}>Cancelar</Button>
            <Button onClick={handleAddComment}>
              <MessageSquarePlus className="h-4 w-4 mr-2" /> Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
