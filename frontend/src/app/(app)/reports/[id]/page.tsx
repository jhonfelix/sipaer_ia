"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Loader2, Bot, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import {
  ReportSidebar,
  ReportEditor,
  AIAssistantPanel,
} from "@/components/report";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { reports as reportsApi, chat as chatApi } from "@/lib/api";
import type { AIMessage, Report } from "@/types/report";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFullDocument(report: Report): string {
  return report.sections
    .map((section) => {
      const sectionAnchor = `<div data-section-id="${section.id}" data-divider-level="section">${section.title}</div>`;
      const subsections = (section.subsections || [])
        .map((sub) => {
          const subAnchor = `<div data-subsection-id="${sub.id}" data-divider-level="subsection">${sub.title}</div>`;
          return subAnchor + (sub.content || "<p></p>");
        })
        .join("");
      return sectionAnchor + subsections;
    })
    .join("");
}

function hasRealContent(html: string): boolean {
  if (!html || html === "<p></p>") return false;
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

function parseDocumentBack(html: string, prevReport: Report): Report {
  if (typeof window === "undefined") return prevReport;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return prevReport;

  const contentMap = new Map<string, string>();
  let currentSubId: string | null = null;
  const buffer: string[] = [];

  const flush = () => {
    if (currentSubId !== null) {
      contentMap.set(currentSubId, buffer.join("") || "<p></p>");
    }
  };

  for (const child of Array.from(root.childNodes)) {
    const el = child as HTMLElement;
    const subId = el.getAttribute?.("data-subsection-id");
    const secId = el.getAttribute?.("data-section-id");

    if (subId) {
      flush();
      currentSubId = subId;
      buffer.length = 0;
    } else if (secId) {
      flush();
      currentSubId = null;
      buffer.length = 0;
    } else if (currentSubId !== null) {
      buffer.push((el as HTMLElement).outerHTML ?? "");
    }
  }
  flush();

  const updatedSections = prevReport.sections.map((section) => {
    const updatedSubs = section.subsections?.map((sub) => {
      const newContent = contentMap.has(sub.id) ? contentMap.get(sub.id)! : sub.content;
      return {
        ...sub,
        content: newContent,
        isCompleted: hasRealContent(newContent),
      };
    });
    const allSubsCompleted =
      updatedSubs && updatedSubs.length > 0
        ? updatedSubs.every((s) => s.isCompleted)
        : section.isCompleted;
    return { ...section, subsections: updatedSubs, isCompleted: allSubsCompleted };
  });

  const completedCount = updatedSections.reduce((acc, sec) => {
    if (sec.subsections?.length) return acc + sec.subsections.filter((s) => s.isCompleted).length;
    return acc + (sec.isCompleted ? 1 : 0);
  }, 0);
  const totalCount = updatedSections.reduce((acc, sec) => {
    return acc + (sec.subsections?.length || 1);
  }, 0);

  return {
    ...prevReport,
    sections: updatedSections,
    progress: { total: totalCount, completed: completedCount },
  };
}

function getSectionForSubsection(report: Report, subsectionId: string): string {
  for (const section of report.sections) {
    if (section.subsections?.some((s) => s.id === subsectionId)) {
      return section.id;
    }
  }
  return report.sections[0]?.id || "";
}

function buildSectionsPayload(report: Report) {
  const sections: Record<string, {
    content?: string;
    is_completed?: boolean;
    subsections?: Record<string, { content?: string; is_completed?: boolean }>;
  }> = {};

  for (const section of report.sections) {
    const subs: Record<string, { content?: string; is_completed?: boolean }> = {};
    for (const sub of section.subsections ?? []) {
      subs[sub.id] = { content: sub.content, is_completed: sub.isCompleted };
    }
    sections[section.id] = {
      content: section.content,
      is_completed: section.isCompleted,
      subsections: subs,
    };
  }
  return sections;
}

function generateMockResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  if (msg.includes("reescreva") || msg.includes("reescrever")) {
    return `Aqui está o texto reescrito com maior precisão técnica SIPAER:\n\n**Versão melhorada:**\nO texto foi reformulado utilizando terminologia padronizada conforme NSCA 3-13, com ênfase na objetividade factual e conformidade com o Anexo 13 da ICAO.\n\nDeseja que eu aplique outras melhorias?`;
  }
  if (msg.includes("expanda") || msg.includes("expandir")) {
    return `**Texto expandido com detalhes técnicos:**\n\nO trecho selecionado foi desenvolvido com informações adicionais relevantes para a investigação:\n1. Contexto operacional completo\n2. Referências normativas aplicáveis (RBAC 137, NSCA 3-13)\n3. Fatores de risco identificados\n\nPosso inserir este conteúdo diretamente no editor.`;
  }
  if (msg.includes("melhor") || msg.includes("texto")) {
    return `Analisei o texto e identifiquei oportunidades de melhoria:\n\n1. **Precisão terminológica**: Substituir termos genéricos por vocabulário técnico SIPAER\n2. **Estrutura**: Organizar em sequência cronológica conforme NSCA 3-13\n3. **Objetividade**: Remover expressões subjetivas\n\nPosso aplicar essas melhorias automaticamente?`;
  }
  if (msg.includes("traduz") || msg.includes("inglês")) {
    return `Posso traduzir o texto para inglês técnico aeronáutico, seguindo as convenções da ICAO e do Anexo 13.\n\nA tradução manterá:\n- Terminologia técnica padronizada\n- Siglas internacionais (CFIT, LOC-I, etc.)\n- Formato de coordenadas e unidades\n\nDeseja que eu prossiga com a tradução?`;
  }
  if (msg.includes("fator") || msg.includes("contribu")) {
    return `Com base nos dados da ocorrência, identifico os seguintes fatores potenciais:\n\n**Fatores Humanos:**\n- Julgamento de pilotagem\n- Supervisão inadequada\n\n**Fatores Operacionais:**\n- Condições meteorológicas marginais\n- Planejamento de voo\n\nDeseja que eu detalhe algum desses fatores?`;
  }
  return `Entendi sua solicitação. Baseado nos dados da ocorrência e nas normas SIPAER vigentes, posso ajudá-lo com:\n\n- Revisão técnica do texto\n- Sugestões de estruturação\n- Verificação de conformidade normativa\n- Tradução técnica\n\nComo posso ajudar especificamente?`;
}

// ── Loading / Error states ────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-muted-foreground text-sm">Carregando relatório…</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-background">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-400/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <p className="text-foreground font-medium">Erro ao carregar relatório</p>
          <p className="text-muted-foreground text-sm mt-1">{message}</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border text-muted-foreground hover:text-foreground text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para relatórios
        </button>
      </div>
    </div>
  );
}

function GenerationProgressModal({ report }: { report: Report }) {
  const subs = useMemo(
    () =>
      report.sections.flatMap((section) =>
        (section.subsections ?? []).map((sub) => ({ ...sub, sectionTitle: section.title }))
      ),
    [report]
  );
  const total = subs.length;
  const completed = subs.filter((s) => hasRealContent(s.content)).length;
  const currentIndex = subs.findIndex((s) => !hasRealContent(s.content));
  const currentLabel = currentIndex >= 0 ? subs[currentIndex].title : "Finalizando relatório…";
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="py-4 px-1 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-base">Gerando relatório com IA…</p>
              <p className="text-muted-foreground text-sm mt-1">{currentLabel}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{completed}/{total} seções · {percent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {subs.map((s, i) => {
              const done = hasRealContent(s.content);
              const active = !done && i === currentIndex;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    done
                      ? "bg-emerald-500/5 border border-emerald-500/20"
                      : active
                      ? "bg-primary/8 border border-primary/25"
                      : "bg-muted/20 border border-border/50 opacity-40"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      done ? "bg-emerald-500/20" : active ? "bg-primary/20 animate-pulse" : "bg-muted"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : active ? (
                      <RefreshCw className="w-3 h-3 text-primary animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground/60 truncate">{s.sectionTitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [loadingState, setLoadingState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [activeSubsection, setActiveSubsection] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiModel, setAiModel] = useState("gpt-oss-120b");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoadingState("loading");
    reportsApi
      .get(id)
      .then((r) => {
        setReport(r);
        setDocumentContent(buildFullDocument(r));
        const firstSub = r.sections[0]?.subsections?.[0]?.id ?? "";
        setActiveSubsection(firstSub);
        setLoadingState("ready");
        if (r.generationStatus === "pending" || r.generationStatus === "generating") {
          setIsGenerating(true);
        }
      })
      .catch((err: Error) => {
        setErrorMessage(err.message ?? "Relatório não encontrado");
        setLoadingState("error");
      });
  }, [id]);

  // Polling: verifica geração a cada 4s até concluir ou falhar.
  // Atualiza `report` a cada tick (progresso real por subseção no modal),
  // mas só empurra `documentContent` para o editor quando a geração terminar.
  useEffect(() => {
    if (!isGenerating || !id) return;
    const interval = setInterval(async () => {
      try {
        const updated = await reportsApi.get(id);
        setReport(updated);
        if (updated.generationStatus === "done") {
          clearInterval(interval);
          setIsGenerating(false);
          setDocumentContent(buildFullDocument(updated));
        } else if (updated.generationStatus === "failed") {
          clearInterval(interval);
          setIsGenerating(false);
          setGenerationFailed(true);
        }
      } catch {
        // erro de rede — continua tentando
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isGenerating, id]);

  const activeSection = useMemo(
    () => (report ? getSectionForSubsection(report, activeSubsection) : ""),
    [report, activeSubsection]
  );

  const activeSubsectionTitle = useMemo(() => {
    if (!report) return "seção atual";
    for (const section of report.sections) {
      const sub = section.subsections?.find((s) => s.id === activeSubsection);
      if (sub) return sub.title;
    }
    return report.sections[0]?.title ?? "seção atual";
  }, [report, activeSubsection]);

  const handleContentChange = useCallback((html: string) => {
    setIsSaved(false);
    setDocumentContent(html);
    setReport((prev) => (prev ? parseDocumentBack(html, prev) : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!report || isSaving) return;
    setIsSaving(true);
    try {
      const updated = await reportsApi.update(id, {
        sections: buildSectionsPayload(report),
      });
      setReport(updated);
      setIsSaved(true);
    } catch {
      // leave isSaved=false so the user can retry
    } finally {
      setIsSaving(false);
    }
  }, [id, report, isSaving]);

  const handleSubsectionVisible = useCallback((subsectionId: string) => {
    setActiveSubsection(subsectionId);
  }, []);

  const handleSectionChange = useCallback(
    (_sectionId: string, subsectionId?: string) => {
      if (subsectionId) setActiveSubsection(subsectionId);
    },
    []
  );

  const handleSendMessage = useCallback(async (message: string, model = "gpt-oss-120b") => {
    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setAiMessages((prev) => [...prev, userMsg]);

    const loadingId = `msg-${Date.now()}-loading`;
    setAiMessages((prev) => [
      ...prev,
      { id: loadingId, role: "assistant", content: "", timestamp: new Date(), isLoading: true },
    ]);

    try {
      const reply = await chatApi.send({
        message,
        model,
        report_id: report ? Number(report.id) : undefined,
        context: `Seção ativa: ${activeSubsectionTitle}`,
        chat_type: "report",
      });
      setAiMessages((prev) =>
        prev.filter((m) => m.id !== loadingId).concat(reply)
      );
    } catch {
      setAiMessages((prev) =>
        prev.filter((m) => m.id !== loadingId).concat({
          id: `msg-${Date.now()}-err`,
          role: "assistant",
          content: "Serviço de IA temporariamente indisponível. Tente novamente em instantes.",
          timestamp: new Date(),
        })
      );
    }
  }, [report, activeSubsectionTitle]);

  if (loadingState === "loading") return <LoadingState />;
  if (loadingState === "error" || !report)
    return <ErrorState message={errorMessage} onBack={() => router.push("/reports")} />;

  return (
    <>
      <ReportSidebar
        report={report}
        activeSection={activeSection}
        activeSubsection={activeSubsection}
        onSectionChange={handleSectionChange}
        scrollContainerRef={editorScrollRef}
      />
      <div
        ref={editorScrollRef}
        className="flex-1 min-w-0 flex flex-col h-full overflow-hidden"
      >
        <ReportEditor
          reportId={report?.id}
          documentContent={documentContent}
          onContentChange={handleContentChange}
          onSubsectionVisible={handleSubsectionVisible}
          isSaved={isSaved}
          onSave={handleSave}
          onAIMessage={(msg) => handleSendMessage(msg, aiModel)}
          scrollContainerRef={editorScrollRef}
        />
      </div>
      {aiOpen && (
        <AIAssistantPanel
          messages={aiMessages}
          onSendMessage={handleSendMessage}
          model={aiModel}
          onModelChange={setAiModel}
          onClose={() => setAiOpen(false)}
          activeSection={activeSubsectionTitle}
          reportId={report ? Number(report.id) : undefined}
        />
      )}

      {/* Botão flutuante — abre o Assistente SIPAER */}
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
          title="Assistente SIPAER"
          aria-label="Abrir Assistente SIPAER"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
        </button>
      )}

      {/* Modal de progresso da geração automática */}
      {isGenerating && report && <GenerationProgressModal report={report} />}
      {generationFailed && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-6 py-3 bg-red-700/95 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>A geração automática falhou — edite as seções manualmente ou tente novamente.</span>
          <button
            onClick={() => setGenerationFailed(false)}
            className="ml-2 underline text-white/80 hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
