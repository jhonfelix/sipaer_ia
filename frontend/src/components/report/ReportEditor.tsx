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
  Plus,
  Download,
  FileEdit,
  Columns,
  Eye,
  Code2,
  ChevronDown,
  Sparkles,
  MessageSquarePlus,
  CheckCircle2,
  RefreshCw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface TemplateFormData {
  classificacao: string;
  tipoAeronave: string;
  operacao: string;
  modeloAeronave: string;
  nivelDanos: string;
  nivelLesoes: string;
  contextoAdicional: string;
  obstaculos: string[];
  faseVoo: string;
  condicoesMet: string[];
  horasTotais: string;
  horasAgricola: string;
  horasTipo: string;
  altitudeOperacao: string;
}

function generateSIPAERReport(data: TemplateFormData): string {
  const dataOcorrencia = "15JAN2026";
  const horaOcorrencia = "0945 (UTC)";
  const matricula = "PR-AGR";
  const fabricante = data.tipoAeronave === "Avião" ? "EMBRAER" : "ROBINSON";
  const modelo = data.modeloAeronave || "EMB-202A IPANEMA";
  const coordenadas = "21°12'45\"S / 050°23'18\"W";
  const municipio = "Presidente Prudente";
  const estado = "SP";

  const faseVooStr = data.faseVoo || "Não informada";
  const obstaculosStr = data.obstaculos.length > 0 ? data.obstaculos.join(", ") : "Nenhum identificado";
  const condicoesMetStr = data.condicoesMet.length > 0 ? data.condicoesMet.join(", ") : "Condições padrão";
  const altitudeStr = data.altitudeOperacao ? `${data.altitudeOperacao} ft AGL` : "Não informada";

  return `<h1>RELATÓRIO DE INVESTIGAÇÃO</h1>
<h2>OCORRÊNCIA AERONÁUTICA</h2>
<h2>1. INFORMAÇÕES SOBRE A OCORRÊNCIA</h2>
<h3>1.1 Dados da Ocorrência</h3>
<p><strong>Classificação:</strong> ${data.classificacao}</p>
<p><strong>Data:</strong> ${dataOcorrencia}</p>
<p><strong>Hora:</strong> ${horaOcorrencia}</p>
<p><strong>Fase do Voo:</strong> ${faseVooStr}</p>
<p><strong>Altitude de Operação:</strong> ${altitudeStr}</p>
<h3>1.2 Localização</h3>
<p><strong>Local:</strong> Propriedade Rural - Fazenda Santa Clara</p>
<p><strong>Município:</strong> ${municipio}</p>
<p><strong>UF:</strong> ${estado}</p>
<p><strong>Coordenadas:</strong> ${coordenadas}</p>
<h3>1.3 Condições Meteorológicas</h3>
<p><strong>Condições registradas:</strong> ${condicoesMetStr}</p>
<p><strong>Regime de voo:</strong> VMC (Visual Meteorological Conditions)</p>
<p><strong>Vento:</strong> 090°/08kt</p>
<p><strong>Visibilidade:</strong> Superior a 10km</p>
<p><strong>Temperatura:</strong> 28°C</p>
<h3>1.4 Obstáculos na Área de Operação</h3>
<p><strong>Obstáculos identificados:</strong> ${obstaculosStr}</p>
<h2>2. INFORMAÇÕES SOBRE A AERONAVE</h2>
<h3>2.1 Dados da Aeronave</h3>
<p><strong>Matrícula:</strong> ${matricula}</p>
<p><strong>Fabricante:</strong> ${fabricante}</p>
<p><strong>Modelo:</strong> ${modelo}</p>
<p><strong>Tipo:</strong> ${data.tipoAeronave}</p>
<p><strong>Número de Série:</strong> 202001245</p>
<p><strong>Ano de Fabricação:</strong> 2019</p>
<h3>2.2 Nível de Danos</h3>
<p><strong>Danos à Aeronave:</strong> ${data.nivelDanos}</p>
<p><strong>Componentes Danificados:</strong> Hélice, trem de pouso principal esquerdo, asa esquerda (bordo de ataque), carenagem do motor.</p>
<h3>2.3 Operação</h3>
<p><strong>Tipo de Operação:</strong> ${data.operacao}</p>
<p><strong>Operador:</strong> AEROAGRÍCOLA OESTE PAULISTA LTDA</p>
<h2>3. INFORMAÇÕES SOBRE A TRIPULAÇÃO</h2>
<h3>3.1 Piloto em Comando</h3>
<p><strong>Horas Totais de Voo:</strong> ${data.horasTotais ? data.horasTotais + ":00" : "8.450:00"}</p>
<p><strong>Horas em Aviação Agrícola:</strong> ${data.horasAgricola ? data.horasAgricola + ":00" : "4.100:00"}</p>
<p><strong>Horas no Tipo:</strong> ${data.horasTipo ? data.horasTipo + ":00" : "3.200:00"}</p>
<h3>3.2 Lesões</h3>
<p><strong>Tripulantes:</strong> ${data.nivelLesoes === "Ileso" ? "01 ileso" : data.nivelLesoes === "Leves" ? "01 com lesões leves" : data.nivelLesoes === "Graves" ? "01 com lesões graves" : "01 vítima fatal"}</p>
<h2>4. HISTÓRICO DO VOO</h2>
<p>No dia ${dataOcorrencia}, a aeronave ${matricula} decolou da pista de operação localizada na Fazenda Santa Clara, município de ${municipio}/${estado}, por volta das 06:30 (UTC), com o objetivo de realizar operação de pulverização aérea agrícola em lavoura de soja.</p>
<p>De acordo com relato do piloto, as condições meteorológicas estavam favoráveis para a operação, com vento calmo e boa visibilidade. A aeronave estava carregada com aproximadamente 600 litros de calda.</p>
<p>O piloto informou que realizou procedimento padrão de decolagem, utilizando a pista de terra compactada de aproximadamente 800 metros de extensão. Durante a corrida de decolagem, em velocidade estimada de 55kt, a aeronave sofreu oscilação lateral inesperada.</p>
${data.contextoAdicional ? `<p><strong>Informações Adicionais:</strong> ${data.contextoAdicional}</p>` : ""}
<h2>5. ANÁLISE</h2>
<h3>5.1 Aspecto Operacional</h3>
<p>A análise do aspecto operacional identificou que o piloto possuía experiência significativa em operações aeroagrícolas.</p>
<h3>5.2 Fatores Contribuintes</h3>
<ul>
<li><strong>Infraestrutura Aeroportuária:</strong> Condições inadequadas da pista de operação.</li>
<li><strong>Julgamento do Piloto:</strong> Possível subestimação das condições da pista antes da decolagem.</li>
</ul>
<h2>6. CONCLUSÃO PRELIMINAR</h2>
<p>Diante das evidências coletadas e da análise realizada, conclui-se preliminarmente que a ocorrência foi caracterizada como <strong>${data.classificacao}</strong>.</p>
<hr/>
<p><em>Relatório gerado em conformidade com os padrões SIPAER.</em></p>`;
}

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
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [isDedaloModalOpen, setIsDedaloModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [dedaloCode, setDedaloCode] = useState("");
  const [lastSaved, setLastSaved] = useState<Date>();
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>({
    classificacao: "",
    tipoAeronave: "",
    operacao: "",
    modeloAeronave: "",
    nivelDanos: "",
    nivelLesoes: "",
    contextoAdicional: "",
    obstaculos: [],
    faseVoo: "",
    condicoesMet: [],
    horasTotais: "",
    horasAgricola: "",
    horasTipo: "",
    altitudeOperacao: "",
  });

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

  // Set initial content on mount
  useEffect(() => {
    if (editor && isFirstMount.current && documentContent) {
      isFirstMount.current = false;
      editor.commands.setContent(documentContent);
    }
  }, [editor, documentContent]);

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

  const GEN_STEPS = [
    { label: "Analisando dados da ocorrência...", detail: "Classificação, fase do voo e obstáculos" },
    { label: "Consultando base de dados SIPAER...", detail: "Ocorrências similares — aviação agrícola" },
    { label: "Identificando fatores contribuintes...", detail: "Humano · Material · Operacional · Ambiente" },
    { label: "Estruturando seções do relatório...", detail: "Conformidade NSCA 3-13 e RBAC 137" },
    { label: "Gerando histórico do voo...", detail: "Sequência cronológica dos eventos" },
    { label: "Elaborando análise técnica...", detail: "Aspectos operacional, humano e material" },
    { label: "Verificando conformidade normativa...", detail: "Normas SIPAER e regulamentos ANAC" },
    { label: "Revisando terminologia técnica...", detail: "Padronização CENIPA / ICAO Annex 13" },
    { label: "Finalizando relatório...", detail: "Consolidação e formatação final" },
  ];

  const handleGenerateReport = useCallback(() => {
    if (!editor) return;
    if (!templateFormData.classificacao || !templateFormData.tipoAeronave) {
      toast({
        title: "Campo Obrigatório",
        description: "Por favor, preencha pelo menos a classificação e o tipo de aeronave",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratingStep(0);

    const delays = [900, 1000, 1700, 1700, 1700, 1500, 1900, 1800, 1800];
    let cum = 0;
    delays.forEach((d, i) => {
      cum += d;
      setTimeout(() => setGeneratingStep(i + 1), cum);
    });

    setTimeout(() => {
      const reportContent = generateSIPAERReport(templateFormData);
      editor.commands.setContent(reportContent);
      onContentChange(reportContent);
      setIsGenerating(false);
      setGeneratingStep(0);
      setIsTemplateModalOpen(false);
      setTemplateFormData({
        classificacao: "",
        tipoAeronave: "",
        operacao: "",
        modeloAeronave: "",
        nivelDanos: "",
        nivelLesoes: "",
        contextoAdicional: "",
        obstaculos: [],
        faseVoo: "",
        condicoesMet: [],
        horasTotais: "",
        horasAgricola: "",
        horasTipo: "",
        altitudeOperacao: "",
      });
      toast({
        title: "Relatório gerado com sucesso",
        description: "O template do relatório SIPAER foi inserido no editor.",
        variant: "success",
      });
    }, delays.reduce((a, b) => a + b, 0) + 500);
  }, [editor, templateFormData, onContentChange, toast]);

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
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            title="Agiliza a confecção inicial, padroniza relatórios e reduz tempo em tarefas repetitivas."
            onClick={() => setIsTemplateModalOpen(true)}
          >
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
                  className="p-4 prose prose-invert max-w-none dark:prose-invert"
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
                className="prose prose-invert max-w-none dark:prose-invert"
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

      {/* Template Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={(open) => { if (!isGenerating) setIsTemplateModalOpen(open); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {isGenerating ? (
            <div className="py-6 px-2 space-y-6">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-base">Gerando relatório SIPAER...</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {generatingStep < GEN_STEPS.length ? GEN_STEPS[generatingStep].label : "Finalizando..."}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span>{Math.round((generatingStep / GEN_STEPS.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-500"
                    style={{ width: `${(generatingStep / GEN_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {GEN_STEPS.map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      i < generatingStep
                        ? "bg-emerald-500/5 border border-emerald-500/20"
                        : i === generatingStep
                        ? "bg-primary/8 border border-primary/25"
                        : "bg-muted/20 border border-border/50 opacity-40"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      i < generatingStep ? "bg-emerald-500/20" : i === generatingStep ? "bg-primary/20 animate-pulse" : "bg-muted"
                    }`}>
                      {i < generatingStep
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        : i === generatingStep
                        ? <RefreshCw className="w-3 h-3 text-primary animate-spin" />
                        : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${i <= generatingStep ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                      <p className="text-xs text-muted-foreground/60 font-mono">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Criar Template de Relatório
                </DialogTitle>
                <DialogDescription>
                  Preencha os campos abaixo para gerar um relatório aeronáutico no padrão SIPAER por meio de inteligência artificial.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="classificacao">Classificação da Ocorrência</Label>
                  <Select value={templateFormData.classificacao} onValueChange={(v) => setTemplateFormData((p) => ({ ...p, classificacao: v }))}>
                    <SelectTrigger id="classificacao"><SelectValue placeholder="Selecione a classificação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACIDENTE">Acidente</SelectItem>
                      <SelectItem value="INCIDENTE GRAVE">Incidente Grave</SelectItem>
                      <SelectItem value="INCIDENTE">Incidente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tipoAeronave">Tipo de Aeronave</Label>
                  <Select value={templateFormData.tipoAeronave} onValueChange={(v) => setTemplateFormData((p) => ({ ...p, tipoAeronave: v }))}>
                    <SelectTrigger id="tipoAeronave"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Avião">Avião</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="operacao">Operação</Label>
                  <Select value={templateFormData.operacao} onValueChange={(v) => setTemplateFormData((p) => ({ ...p, operacao: v }))}>
                    <SelectTrigger id="operacao"><SelectValue placeholder="Selecione a operação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aeroagrícola">Aeroagrícola</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="modeloAeronave">Modelo da Aeronave</Label>
                  <Select value={templateFormData.modeloAeronave} onValueChange={(v) => setTemplateFormData((p) => ({ ...p, modeloAeronave: v }))}>
                    <SelectTrigger id="modeloAeronave"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMB-202A IPANEMA">EMB-202A Ipanema</SelectItem>
                      <SelectItem value="AT-502B AIR TRACTOR">AT-502B Air Tractor</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nivelDanos">Nível de Danos</Label>
                  <Select value={templateFormData.nivelDanos} onValueChange={(v) => setTemplateFormData((p) => ({ ...p, nivelDanos: v }))}>
                    <SelectTrigger id="nivelDanos"><SelectValue placeholder="Selecione o nível de danos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nenhum">Nenhum</SelectItem>
                      <SelectItem value="Leve">Leve</SelectItem>
                      <SelectItem value="Substancial">Substancial</SelectItem>
                      <SelectItem value="Destruída">Destruída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nivelLesoes">Nível de Lesões</Label>
                  <Select value={templateFormData.nivelLesoes} onValueChange={(v) => setTemplateFormData((p) => ({ ...p, nivelLesoes: v }))}>
                    <SelectTrigger id="nivelLesoes"><SelectValue placeholder="Selecione o nível de lesões" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ileso">Ileso</SelectItem>
                      <SelectItem value="Leves">Leves</SelectItem>
                      <SelectItem value="Graves">Graves</SelectItem>
                      <SelectItem value="Fatal">Fatal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="faseVoo">Fase do Voo</Label>
                  <Select value={templateFormData.faseVoo} onValueChange={(v) => setTemplateFormData((p) => ({ ...p, faseVoo: v }))}>
                    <SelectTrigger id="faseVoo"><SelectValue placeholder="Selecione a fase do voo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Decolagem">Decolagem</SelectItem>
                      <SelectItem value="Subida inicial">Subida inicial</SelectItem>
                      <SelectItem value="Deslocamento">Deslocamento</SelectItem>
                      <SelectItem value="Aplicação agrícola">Aplicação agrícola</SelectItem>
                      <SelectItem value="Manobra de retorno">Manobra de retorno</SelectItem>
                      <SelectItem value="Aproximação">Aproximação</SelectItem>
                      <SelectItem value="Pouso">Pouso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Presença de Obstáculos na Área</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Linhas de energia", "Torres", "Árvores", "Pivô de irrigação", "Cercas", "Não identificado"].map((obs) => {
                      const active = templateFormData.obstaculos.includes(obs);
                      return (
                        <button
                          key={obs}
                          type="button"
                          onClick={() => setTemplateFormData((p) => ({ ...p, obstaculos: active ? p.obstaculos.filter((o) => o !== obs) : [...p.obstaculos, obs] }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? "bg-primary/20 border-primary text-primary" : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          {obs}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Condições Meteorológicas</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Vento fraco", "Vento moderado", "Vento forte", "Turbulência", "Alta temperatura", "Visibilidade reduzida"].map((cond) => {
                      const active = templateFormData.condicoesMet.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => setTemplateFormData((p) => ({ ...p, condicoesMet: active ? p.condicoesMet.filter((c) => c !== cond) : [...p.condicoesMet, cond] }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? "bg-primary/20 border-primary text-primary" : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          {cond}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="altitudeOperacao">Altitude de Operação (ft AGL)</Label>
                  <Input id="altitudeOperacao" type="number" placeholder="Ex: 10" value={templateFormData.altitudeOperacao} onChange={(e) => setTemplateFormData((p) => ({ ...p, altitudeOperacao: e.target.value }))} />
                </div>

                <div className="grid gap-2">
                  <Label>Experiência do Piloto (horas)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1">
                      <span className="text-xs text-muted-foreground">Horas totais</span>
                      <Input type="number" placeholder="Ex: 8450" value={templateFormData.horasTotais} onChange={(e) => setTemplateFormData((p) => ({ ...p, horasTotais: e.target.value }))} />
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-muted-foreground">Em aviação agrícola</span>
                      <Input type="number" placeholder="Ex: 4100" value={templateFormData.horasAgricola} onChange={(e) => setTemplateFormData((p) => ({ ...p, horasAgricola: e.target.value }))} />
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-muted-foreground">No tipo</span>
                      <Input type="number" placeholder="Ex: 3200" value={templateFormData.horasTipo} onChange={(e) => setTemplateFormData((p) => ({ ...p, horasTipo: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contextoAdicional">Contexto Adicional</Label>
                  <Textarea
                    id="contextoAdicional"
                    placeholder="Descreva brevemente a sequência do acidente..."
                    value={templateFormData.contextoAdicional}
                    onChange={(e) => setTemplateFormData((p) => ({ ...p, contextoAdicional: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleGenerateReport}>
                  <Sparkles className="h-5 w-5 mr-1" /> Gerar Relatório
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
