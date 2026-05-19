import { Extension } from "@tiptap/core";
import type { Range } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  category: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

export interface SlashMenuState {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  clientRect: (() => DOMRect | null) | null | undefined;
  selectedIndex: number;
}

export function getSlashCommandItems(onAICommand?: (action: string, text: string) => void): SlashCommandItem[] {
  return [
    // ── Básico ─────────────────────────────────────────────────────────
    {
      category: "Básico",
      title: "Parágrafo",
      description: "Texto padrão",
      icon: "¶",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      category: "Básico",
      title: "Título 1",
      description: "Título grande",
      icon: "H1",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
    },
    {
      category: "Básico",
      title: "Título 2",
      description: "Título médio",
      icon: "H2",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
    },
    {
      category: "Básico",
      title: "Título 3",
      description: "Subtítulo",
      icon: "H3",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
    },
    {
      category: "Básico",
      title: "Citação",
      description: "Bloco de citação",
      icon: "❝",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      category: "Básico",
      title: "Divisor",
      description: "Linha separadora",
      icon: "—",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    // ── Listas ─────────────────────────────────────────────────────────
    {
      category: "Listas",
      title: "Lista com Pontos",
      description: "Lista não ordenada",
      icon: "•",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      category: "Listas",
      title: "Lista Numerada",
      description: "Lista ordenada",
      icon: "1.",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      category: "Listas",
      title: "Lista de Tarefas",
      description: "Checklist interativo",
      icon: "☑",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    // ── Callouts ───────────────────────────────────────────────────────
    {
      category: "Callouts",
      title: "Info",
      description: "Nota informativa",
      icon: "ℹ",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({
          type: "callout",
          attrs: { variant: "info" },
          content: [{ type: "paragraph" }],
        }).run(),
    },
    {
      category: "Callouts",
      title: "Aviso",
      description: "Alerta de atenção",
      icon: "⚠",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({
          type: "callout",
          attrs: { variant: "warning" },
          content: [{ type: "paragraph" }],
        }).run(),
    },
    {
      category: "Callouts",
      title: "Perigo",
      description: "Alerta crítico",
      icon: "⛔",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({
          type: "callout",
          attrs: { variant: "danger" },
          content: [{ type: "paragraph" }],
        }).run(),
    },
    {
      category: "Callouts",
      title: "Sucesso",
      description: "Confirmação positiva",
      icon: "✓",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({
          type: "callout",
          attrs: { variant: "success" },
          content: [{ type: "paragraph" }],
        }).run(),
    },
    // ── Layout ─────────────────────────────────────────────────────────
    {
      category: "Layout",
      title: "2 Colunas",
      description: "Layout em duas colunas",
      icon: "⫾",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({
          type: "columns",
          attrs: { count: 2 },
          content: [
            { type: "column", content: [{ type: "paragraph" }] },
            { type: "column", content: [{ type: "paragraph" }] },
          ],
        }).run(),
    },
    {
      category: "Layout",
      title: "3 Colunas",
      description: "Layout em três colunas",
      icon: "⫿",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({
          type: "columns",
          attrs: { count: 3 },
          content: [
            { type: "column", content: [{ type: "paragraph" }] },
            { type: "column", content: [{ type: "paragraph" }] },
            { type: "column", content: [{ type: "paragraph" }] },
          ],
        }).run(),
    },
    // ── Código ─────────────────────────────────────────────────────────
    {
      category: "Código",
      title: "Bloco de Código",
      description: "Código com syntax highlight",
      icon: "</>",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    // ── Tabelas ────────────────────────────────────────────────────────
    {
      category: "Tabelas",
      title: "Tabela 3×3",
      description: "Inserir tabela básica",
      icon: "⊞",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      category: "Tabelas",
      title: "Tabela 5×5",
      description: "Tabela grande",
      icon: "⊞",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range)
          .insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run(),
    },
    // ── Mídia ──────────────────────────────────────────────────────────
    {
      category: "Mídia",
      title: "Imagem",
      description: "Inserir imagem com legenda",
      icon: "🖼",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertContent({
          type: "imageBlock",
          attrs: { src: null, alt: "", align: "center" },
          content: [{ type: "paragraph" }],
        }).run(),
    },
    // ── IA ─────────────────────────────────────────────────────────────
    {
      category: "IA",
      title: "Melhorar texto",
      description: "Reescrever com precisão técnica",
      icon: "✦",
      command: ({ editor, range }) => {
        const { from, to } = editor.state.selection;
        const text = from !== to ? editor.state.doc.textBetween(from, to, " ") : "";
        editor.chain().focus().deleteRange(range).run();
        onAICommand?.("improve", text);
      },
    },
    {
      category: "IA",
      title: "Resumir",
      description: "Condensar o conteúdo selecionado",
      icon: "✦",
      command: ({ editor, range }) => {
        const { from, to } = editor.state.selection;
        const text = from !== to ? editor.state.doc.textBetween(from, to, " ") : "";
        editor.chain().focus().deleteRange(range).run();
        onAICommand?.("summarize", text);
      },
    },
    {
      category: "IA",
      title: "Revisar SIPAER",
      description: "Verificar conformidade normativa",
      icon: "✦",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        onAICommand?.("sipaerReview", "");
      },
    },
    {
      category: "IA",
      title: "Corrigir gramática",
      description: "Corrigir erros gramaticais",
      icon: "✦",
      command: ({ editor, range }) => {
        const { from, to } = editor.state.selection;
        const text = from !== to ? editor.state.doc.textBetween(from, to, " ") : "";
        editor.chain().focus().deleteRange(range).run();
        onAICommand?.("fixGrammar", text);
      },
    },
  ];
}

interface SlashCommandOptions {
  onOpen: (state: SlashMenuState) => void;
  onUpdate: (
    items: SlashCommandItem[],
    command: (item: SlashCommandItem) => void,
    clientRect: (() => DOMRect | null) | null | undefined
  ) => void;
  onClose: () => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  onAICommand: (action: string, text: string) => void;
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      onOpen: () => {},
      onUpdate: () => {},
      onClose: () => {},
      onKeyDown: () => false,
      onAICommand: () => {},
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: true,
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase();
          return getSlashCommandItems(options.onAICommand).filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.category.toLowerCase().includes(q)
          );
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
        render: () => ({
          onStart: (props: SuggestionProps) => {
            options.onOpen({
              items: props.items as SlashCommandItem[],
              command: (item) => props.command(item),
              clientRect: props.clientRect,
              selectedIndex: 0,
            });
          },
          onUpdate: (props: SuggestionProps) => {
            options.onUpdate(
              props.items as SlashCommandItem[],
              (item) => props.command(item),
              props.clientRect
            );
          },
          onKeyDown: (props: SuggestionKeyDownProps) => options.onKeyDown(props),
          onExit: () => options.onClose(),
        }),
      }),
    ];
  },
});
