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
  Sparkles,
  MessageSquarePlus,
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
import { useToast } from "@/hooks/use-toast";
import type { ReportSubsection } from "@/types/report";

interface TemplateFormData {
  classificacao: string;
  tipoAeronave: string;
  operacao: string;
  modeloAeronave: string;
  nivelDanos: string;
  nivelLesoes: string;
  contextoAdicional: string;
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

  const report = `<h1>RELATÓRIO DE INVESTIGAÇÃO</h1>
<h2>OCORRÊNCIA AERONÁUTICA</h2>

<h2>1. INFORMAÇÕES SOBRE A OCORRÊNCIA</h2>

<h3>1.1 Dados da Ocorrência</h3>
<p><strong>Classificação:</strong> ${data.classificacao}</p>
<p><strong>Data:</strong> ${dataOcorrencia}</p>
<p><strong>Hora:</strong> ${horaOcorrencia}</p>
<p><strong>Tipo de Ocorrência:</strong> LOC-G (Perda de Controle no Solo)</p>

<h3>1.2 Localização</h3>
<p><strong>Local:</strong> Propriedade Rural - Fazenda Santa Clara</p>
<p><strong>Município:</strong> ${municipio}</p>
<p><strong>UF:</strong> ${estado}</p>
<p><strong>Coordenadas:</strong> ${coordenadas}</p>

<h3>1.3 Condições Meteorológicas</h3>
<p><strong>Condições:</strong> VMC (Visual Meteorological Conditions)</p>
<p><strong>Vento:</strong> 090°/08kt</p>
<p><strong>Visibilidade:</strong> Superior a 10km</p>
<p><strong>Teto:</strong> Céu claro</p>
<p><strong>Temperatura:</strong> 28°C</p>

<h2>2. INFORMAÇÕES SOBRE A AERONAVE</h2>

<h3>2.1 Dados da Aeronave</h3>
<p><strong>Matrícula:</strong> ${matricula}</p>
<p><strong>Fabricante:</strong> ${fabricante}</p>
<p><strong>Modelo:</strong> ${modelo}</p>
<p><strong>Tipo:</strong> ${data.tipoAeronave}</p>
<p><strong>Número de Série:</strong> 202001245</p>
<p><strong>Ano de Fabricação:</strong> 2019</p>

<h3>2.2 Certificados e Registros</h3>
<p><strong>Certificado de Aeronavegabilidade:</strong> Válido</p>
<p><strong>Último RAMP Check:</strong> 10JAN2026 - Conforme</p>
<p><strong>Horas Totais de Célula:</strong> 2.847:25</p>
<p><strong>Horas Motor:</strong> 1.245:30 (desde última revisão geral)</p>

<h3>2.3 Nível de Danos</h3>
<p><strong>Danos à Aeronave:</strong> ${data.nivelDanos}</p>
<p><strong>Componentes Danificados:</strong> Hélice, trem de pouso principal esquerdo, asa esquerda (bordo de ataque), carenagem do motor.</p>

<h3>2.4 Operação</h3>
<p><strong>Tipo de Operação:</strong> ${data.operacao}</p>
<p><strong>Operador:</strong> AEROAGRÍCOLA OESTE PAULISTA LTDA</p>
<p><strong>CNPJ:</strong> 12.345.678/0001-90</p>

<h2>3. INFORMAÇÕES SOBRE A TRIPULAÇÃO</h2>

<h3>3.1 Piloto em Comando</h3>
<p><strong>Nacionalidade:</strong> Brasileira</p>
<p><strong>Sexo:</strong> Masculino</p>
<p><strong>Idade:</strong> 42 anos</p>
<p><strong>Categoria de Licença:</strong> PCH (Piloto Comercial - Avião)</p>
<p><strong>Habilitações:</strong> MLTE, IFRA, PAGA</p>
<p><strong>Validade CMA:</strong> 30JUN2026</p>
<p><strong>Horas Totais de Voo:</strong> 8.450:00</p>
<p><strong>Horas no Tipo:</strong> 3.200:00</p>
<p><strong>Horas Últimos 30 Dias:</strong> 85:30</p>
<p><strong>Horas Últimas 24 Horas:</strong> 4:15</p>

<h3>3.2 Lesões</h3>
<p><strong>Tripulantes:</strong> ${data.nivelLesoes === "Ileso" ? "01 ileso" : data.nivelLesoes === "Leves" ? "01 com lesões leves" : data.nivelLesoes === "Graves" ? "01 com lesões graves" : "01 vítima fatal"}</p>
<p><strong>Passageiros:</strong> Não havia</p>
<p><strong>Terceiros:</strong> Não houve</p>

<h2>4. HISTÓRICO DO VOO</h2>

<p>No dia ${dataOcorrencia}, a aeronave ${matricula} decolou da pista de operação localizada na Fazenda Santa Clara, município de ${municipio}/${estado}, por volta das 06:30 (UTC), com o objetivo de realizar operação de pulverização aérea agrícola em lavoura de soja.</p>

<p>De acordo com relato do piloto, as condições meteorológicas estavam favoráveis para a operação, com vento calmo e boa visibilidade. A aeronave estava carregada com aproximadamente 600 litros de calda (mistura de defensivo agrícola e água), dentro dos limites de peso e balanceamento estabelecidos pelo fabricante.</p>

<p>O piloto informou que realizou procedimento padrão de decolagem, utilizando a pista de terra compactada de aproximadamente 800 metros de extensão. Durante a corrida de decolagem, em velocidade estimada de 55kt, a aeronave sofreu oscilação lateral inesperada.</p>

<p>Segundo o piloto, ao tentar corrigir a trajetória, a aeronave ultrapassou os limites laterais da pista, atingindo terreno irregular com vegetação rasteira. O trem de pouso principal esquerdo colapsou ao impactar uma irregularidade do terreno, fazendo com que a aeronave guinasse bruscamente para a esquerda.</p>

<p>A hélice atingiu o solo, danificando-se severamente. A asa esquerda tocou o terreno, sofrendo danos no bordo de ataque. A aeronave veio a parar aproximadamente 50 metros da lateral esquerda da pista.</p>

<p>O piloto conseguiu evacuar a aeronave sem auxílio, não sofrendo lesões significativas. Não houve princípio de incêndio. O produto agrícola contido nos tanques da aeronave foi contido e posteriormente recolhido por equipe especializada.</p>

${data.contextoAdicional ? `<p><strong>Informações Adicionais:</strong> ${data.contextoAdicional}</p>` : ""}

<h2>5. ANÁLISE</h2>

<h3>5.1 Aspecto Operacional</h3>
<p>A análise do aspecto operacional identificou que o piloto possuía experiência significativa em operações aeroagrícolas, com mais de 3.000 horas no tipo da aeronave. A documentação do piloto estava regular, incluindo CMA válido e habilitação PAGA (Piloto Agrícola).</p>

<p>A operação estava sendo conduzida dentro dos parâmetros estabelecidos pela regulamentação vigente (RBAC 137). A aeronave estava dentro dos limites de peso e balanceamento previstos no manual do fabricante.</p>

<h3>5.2 Aspecto Material</h3>
<p>Não foram identificadas evidências de falhas mecânicas ou estruturais que pudessem ter contribuído para a ocorrência. O sistema de controle de voo estava operacional, conforme verificado nos destroços.</p>

<p>O trem de pouso apresentava manutenção em dia, com última inspeção realizada há 30 horas de voo. Não havia discrepâncias registradas nos livros de bordo da aeronave.</p>

<h3>5.3 Aspecto Humano</h3>
<p>O piloto relatou estar em boas condições físicas e psicológicas no momento da ocorrência. Havia dormido aproximadamente 7 horas na noite anterior e estava no terceiro voo do dia.</p>

<p>A análise da carga de trabalho indica que o piloto estava operando dentro dos limites de fadiga estabelecidos pela regulamentação. Não foram identificados fatores como estresse, pressão externa ou uso de substâncias que pudessem afetar o desempenho.</p>

<h3>5.4 Aspecto do Ambiente Operacional</h3>
<p>A pista de operação não estava registrada junto à ANAC, caracterizando-se como pista particular. A superfície apresentava irregularidades e sulcos causados por chuvas recentes, embora o piloto tenha relatado não ter percebido tais condições antes da decolagem.</p>

<p>A vegetação nas laterais da pista estava alta, dificultando a percepção das condições do terreno adjacente.</p>

<h3>5.5 Fatores Contribuintes</h3>
<ul>
<li><strong>Infraestrutura Aeroportuária:</strong> Condições inadequadas da pista de operação, com irregularidades na superfície.</li>
<li><strong>Julgamento do Piloto:</strong> Possível subestimação das condições da pista antes da decolagem.</li>
<li><strong>Supervisão Gerencial:</strong> Ausência de inspeção formal das condições da pista antes do início das operações.</li>
</ul>

<h2>6. CONCLUSÃO PRELIMINAR</h2>

<p>Diante das evidências coletadas e da análise realizada, conclui-se preliminarmente que a ocorrência foi caracterizada como <strong>${data.classificacao}</strong>, resultante de perda de controle direcional durante a corrida de decolagem (LOC-G).</p>

<p>A perda de controle foi precipitada pela interação da aeronave com irregularidades na superfície da pista de operação, que não foram adequadamente avaliadas antes do início da operação de voo.</p>

<p>Os fatores contribuintes identificados relacionam-se principalmente às condições da infraestrutura de solo e ao processo de gerenciamento de risco da operação.</p>

<p>Recomendações de segurança serão emitidas em relatório final, visando prevenir ocorrências similares.</p>

<hr/>
<p><em>Relatório gerado em conformidade com os padrões SIPAER (Sistema de Investigação e Prevenção de Acidentes Aeronáuticos).</em></p>`;

  return report;
}

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
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDedaloModalOpen, setIsDedaloModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [dedaloCode, setDedaloCode] = useState("");
  const [lastSaved, setLastSaved] = useState<Date>();
  const { toast } = useToast();
  const [templateFormData, setTemplateFormData] = useState<TemplateFormData>({
    classificacao: "",
    tipoAeronave: "",
    operacao: "",
    modeloAeronave: "",
    nivelDanos: "",
    nivelLesoes: "",
    contextoAdicional: "",
  });

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

  const handleSave = useCallback(() => {
    onSave();
    setLastSaved(new Date());
    toast({
      description: "Informações salvas com sucesso",
      variant: "success"
    });
  }, [onSave, toast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
    },
    [handleSave]
  );

  const handleGenerateReport = useCallback(() => {
    if (!editor) return;

    const reportContent = generateSIPAERReport(templateFormData);

    if (!templateFormData.classificacao|| !templateFormData.tipoAeronave) {
      toast({
        title: "Campo Obrigatório",
        description: "Por favor, preencha pelo menos a classificação e o tipo de aeronave",
        variant: "destructive"
      });
      return;
    }
    
    editor.commands.setContent(reportContent);
    onContentChange(reportContent);
    setIsTemplateModalOpen(false);

    // Reset form
    setTemplateFormData({
      classificacao: "",
      tipoAeronave: "",
      operacao: "",
      modeloAeronave: "",
      nivelDanos: "",
      nivelLesoes: "",
      contextoAdicional: "",
    });

    toast({
      title: "Relatório gerado com sucesso",
      description: "O template do relatório SIPAER foi inserido no editor.",
      variant: "success",
    });
  }, [editor, templateFormData, onContentChange, toast]);

  const handleOpenTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(true);
  }, []);

  const handleOpenDedaloModal = useCallback(() => {
    setIsDedaloModalOpen(true);
  }, []);

  const handleImportDedalo = useCallback(() => {
    if (!dedaloCode.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o código da ocorrência.",
        variant: "destructive",
      });
      return;
    }

    // Aqui seria feita a integração com o sistema Dédalo
    console.log("Importando código do Dédalo:", dedaloCode);

    setIsDedaloModalOpen(false);
    setDedaloCode("");

    toast({
      title: "Importação iniciada",
      description: `Buscando dados da ocorrência ${dedaloCode} no sistema Dédalo...`,
      variant: "info",
    });
  }, [dedaloCode, toast]);

  const handleOpenCommentModal = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      toast({
        title: "Nenhum texto selecionado",
        description: "Selecione um trecho do texto para adicionar um comentário.",
        variant: "warning",
      });
      return;
    }

    setIsCommentModalOpen(true);
  }, [editor, toast]);

  const handleAddComment = useCallback(() => {
    if (!editor || !commentText.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite um comentário.",
        variant: "destructive",
      });
      return;
    }

    // Adiciona o comentário como highlight com título
    editor
      .chain()
      .focus()
      .setHighlight({ color: '#fef08a' })
      .run();

    setIsCommentModalOpen(false);
    setCommentText("");

    toast({
      title: "Comentário adicionado",
      description: "O trecho foi destacado com seu comentário.",
      variant: "success",
    });
  }, [editor, commentText, toast]);

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
          <Badge variant={isSaved ? "secondary" : "destructive"} className={isSaved && lastSaved ? "text-xs text-green-600 " : "text-xs"}>
            {isSaved && lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString()}` : "Não salvo"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenDedaloModal}>
            <Upload className="w-4 h-4" />
            Importar Dédalo
          </Button>
          <Button variant="default" size="sm" className="gap-2" title="Agiliza a confecção inicial, padroniza relatórios e reduz tempo em tarefas repetitivas, focando em conteúdo técnico." onClick={handleOpenTemplateModal}>
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
        <TabsContent value="editor" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden relative">
          <EditorToolbar editor={editor} />
          <ScrollArea className="flex-1 min-h-0">
            <div className="mx-auto py-2 px-2">
              <EditorContent editor={editor} />
            </div>
          </ScrollArea>

          {/* Botão flutuante de comentário */}
          <Button
            onClick={handleOpenCommentModal}
            size="icon"
            className="absolute top-14 right-4 h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-10"
            title="Adicionar comentário ao texto selecionado"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
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

      {/* Modal de Criação de Template */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles  className="h-5 w-5 text-primary"/> Criar Template de Relatório</DialogTitle>
            <DialogDescription>
            Preencha os campos abaixo para gerar, por meio de inteligência artificial, um relatório aeronáutico no padrão SIPAER, elaborado a partir da análise e consolidação de relatórios técnicos já existentes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Classificação da Ocorrência */}
            <div className="grid gap-2">
              <Label htmlFor="classificacao">Classificação da Ocorrência</Label>
              <Select
                value={templateFormData.classificacao}
                onValueChange={(value) =>
                  setTemplateFormData((prev) => ({ ...prev, classificacao: value }))
                }
              >
                <SelectTrigger id="classificacao">
                  <SelectValue placeholder="Selecione a classificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACIDENTE">Acidente</SelectItem>
                  <SelectItem value="INCIDENTE GRAVE">Incidente Grave</SelectItem>
                  <SelectItem value="INCIDENTE">Incidente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Aeronave */}
            <div className="grid gap-2">
              <Label htmlFor="tipoAeronave">Tipo de Aeronave</Label>
              <Select
                value={templateFormData.tipoAeronave}
                onValueChange={(value) =>
                  setTemplateFormData((prev) => ({ ...prev, tipoAeronave: value }))
                }
              >
                <SelectTrigger id="tipoAeronave">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Avião">Avião</SelectItem>
                  <SelectItem value="Helicóptero">Helicóptero</SelectItem>
                  <SelectItem value="Planador">Planador</SelectItem>
                  <SelectItem value="Ultraleve">Ultraleve</SelectItem>
                  <SelectItem value="Balão">Balão</SelectItem>
                  <SelectItem value="Dirigível">Dirigível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Operação */}
            <div className="grid gap-2">
              <Label htmlFor="operacao">Operação</Label>
              <Select
                value={templateFormData.operacao}
                onValueChange={(value) =>
                  setTemplateFormData((prev) => ({ ...prev, operacao: value }))
                }
              >
                <SelectTrigger id="operacao">
                  <SelectValue placeholder="Selecione a operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aeroagrícola">Aeroagrícola</SelectItem>
                  <SelectItem value="Privado">Privado</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Modelo da Aeronave */}
            <div className="grid gap-2">
              <Label htmlFor="modeloAeronave">Modelo da Aeronave</Label>
              <Select
                value={templateFormData.modeloAeronave}
                onValueChange={(value) =>
                  setTemplateFormData((prev) => ({ ...prev, modeloAeronave: value }))
                }
              >
                <SelectTrigger id="modeloAeronave">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMB-202A IPANEMA">EMB-202A Ipanema</SelectItem>
                  <SelectItem value="AT-502B AIR TRACTOR">AT-502B Air Tractor</SelectItem>
                  <SelectItem value="PA-25 PAWNEE">PA-25 Pawnee</SelectItem>
                  <SelectItem value="CESSNA 188 AG WAGON">Cessna 188 AG Wagon</SelectItem>
                  <SelectItem value="THRUSH 510G">Thrush 510G</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nível de Danos */}
            <div className="grid gap-2">
              <Label htmlFor="nivelDanos">Nível de Danos</Label>
              <Select
                value={templateFormData.nivelDanos}
                onValueChange={(value) =>
                  setTemplateFormData((prev) => ({ ...prev, nivelDanos: value }))
                }
              >
                <SelectTrigger id="nivelDanos">
                  <SelectValue placeholder="Selecione o nível de danos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nenhum">Nenhum</SelectItem>
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Substancial">Substancial</SelectItem>
                  <SelectItem value="Destruída">Destruída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nível de Lesões */}
            <div className="grid gap-2">
              <Label htmlFor="nivelLesoes">Nível de Lesões</Label>
              <Select
                value={templateFormData.nivelLesoes}
                onValueChange={(value) =>
                  setTemplateFormData((prev) => ({ ...prev, nivelLesoes: value }))
                }
              >
                <SelectTrigger id="nivelLesoes">
                  <SelectValue placeholder="Selecione o nível de lesões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ileso">Ileso</SelectItem>
                  <SelectItem value="Leves">Leves</SelectItem>
                  <SelectItem value="Graves">Graves</SelectItem>
                  <SelectItem value="Fatal">Fatal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contexto Adicional */}
            <div className="grid gap-2">
              <Label htmlFor="contextoAdicional">Contexto Adicional</Label>
              <Textarea
                id="contextoAdicional"
                placeholder="Descreva informações adicionais relevantes para o relatório..."
                value={templateFormData.contextoAdicional}
                onChange={(e) =>
                  setTemplateFormData((prev) => ({
                    ...prev,
                    contextoAdicional: e.target.value,
                  }))
                }
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTemplateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleGenerateReport}>
            <Sparkles className="h-5 w-5"/> Gerar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação do Dédalo */}
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
              <Input
                id="dedaloCode"
                placeholder="Ex: A-092/CENIPA/2024"
                value={dedaloCode}
                onChange={(e) => setDedaloCode(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDedaloModalOpen(false);
                setDedaloCode("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleImportDedalo}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Comentário */}
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
              <Textarea
                id="commentText"
                placeholder="Digite seu comentário sobre o trecho selecionado..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCommentModalOpen(false);
                setCommentText("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddComment}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
