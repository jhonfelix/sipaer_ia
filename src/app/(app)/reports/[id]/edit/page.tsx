"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ReportSidebar,
  ReportEditor,
  AIAssistantPanel,
} from "@/components/report";
import {
  mockReport,
  mockAIMessages,
  mockQuickActions,
  mockSuggestedPrompts,
} from "@/lib/mocks/report-data";
import type { AIMessage, AIQuickAction, ReportSubsection } from "@/types/report";

export default function ReportEditPage() {
  // Estado do relatório
  const [report, setReport] = useState(mockReport);
  const [activeSection, setActiveSection] = useState(report.sections[0]?.id || "");
  const [activeSubsection, setActiveSubsection] = useState(
    report.sections[0]?.subsections?.[0]?.id || ""
  );
  const [isSaved, setIsSaved] = useState(true);

  // Estado do assistente IA
  const [aiMessages, setAiMessages] = useState<AIMessage[]>(mockAIMessages);

  // Encontrar a subseção ativa
  const currentSubsection = useMemo(() => {
    const section = report.sections.find((s) => s.id === activeSection);
    if (!section) return null;
    return section.subsections?.find((sub) => sub.id === activeSubsection) || null;
  }, [report.sections, activeSection, activeSubsection]);

  // Handlers
  const handleSectionChange = useCallback(
    (sectionId: string, subsectionId?: string) => {
      setActiveSection(sectionId);
      if (subsectionId) {
        setActiveSubsection(subsectionId);
      } else {
        const section = report.sections.find((s) => s.id === sectionId);
        if (section?.subsections?.[0]) {
          setActiveSubsection(section.subsections[0].id);
        }
      }
    },
    [report.sections]
  );

  const handleContentChange = useCallback((content: string) => {
    setIsSaved(false);
    setReport((prev) => {
      const newSections = prev.sections.map((section) => {
        if (section.id !== activeSection) return section;
        return {
          ...section,
          subsections: section.subsections?.map((sub) => {
            if (sub.id !== activeSubsection) return sub;
            return { ...sub, content };
          }),
        };
      });
      return { ...prev, sections: newSections };
    });
  }, [activeSection, activeSubsection]);

  const handleSave = useCallback(() => {
    // Simular salvamento
    setIsSaved(true);
    console.log("Relatório salvo:", report);
  }, [report]);

  const handleSendMessage = useCallback((message: string) => {
    const userMessage: AIMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setAiMessages((prev) => [...prev, userMessage]);

    // Simular resposta da IA
    const loadingMessage: AIMessage = {
      id: `msg-${Date.now()}-loading`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setAiMessages((prev) => [...prev, loadingMessage]);

    // Simular delay da IA
    setTimeout(() => {
      const aiResponse: AIMessage = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: generateMockResponse(message),
        timestamp: new Date(),
        sources: ["NSCA 3-13", "Manual de Investigação CENIPA"],
      };

      setAiMessages((prev) =>
        prev.filter((m) => !m.isLoading).concat(aiResponse)
      );
    }, 1500);
  }, []);

  const handleQuickAction = useCallback(
    (action: AIQuickAction) => {
      handleSendMessage(action.prompt);
    },
    [handleSendMessage]
  );

  return (
    <>
      <ReportSidebar
        report={report}
        activeSection={activeSection}
        activeSubsection={activeSubsection}
        onSectionChange={handleSectionChange}
      />
      <ReportEditor
        subsection={currentSubsection}
        onContentChange={handleContentChange}
        isSaved={isSaved}
        onSave={handleSave}
      />
      <AIAssistantPanel
        messages={aiMessages}
        quickActions={mockQuickActions}
        suggestedPrompts={mockSuggestedPrompts}
        onSendMessage={handleSendMessage}
        onQuickAction={handleQuickAction}
      />
    </>
  );
}

// Helper para gerar respostas mock da IA
function generateMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("melhor") || lowerMessage.includes("texto")) {
    return `Analisei o texto e identifiquei oportunidades de melhoria:

1. **Precisão terminológica**: Substituir termos genéricos por vocabulário técnico SIPAER
2. **Estrutura**: Organizar em sequência cronológica conforme NSCA 3-13
3. **Objetividade**: Remover expressões subjetivas

Posso aplicar essas melhorias automaticamente?`;
  }

  if (lowerMessage.includes("traduz") || lowerMessage.includes("inglês")) {
    return `Posso traduzir o texto para inglês técnico aeronáutico, seguindo as convenções da ICAO e do Anexo 13.

A tradução manterá:
- Terminologia técnica padronizada
- Siglas internacionais (CFIT, LOC-I, etc.)
- Formato de coordenadas e unidades

Deseja que eu prossiga com a tradução?`;
  }

  if (lowerMessage.includes("fator") || lowerMessage.includes("contribu")) {
    return `Com base nos dados da ocorrência, identifico os seguintes fatores potenciais:

**Fatores Humanos:**
- Julgamento de pilotagem
- Supervisão inadequada

**Fatores Operacionais:**
- Condições meteorológicas marginais
- Planejamento de voo

**Fatores Materiais:**
- A ser investigado

Deseja que eu detalhe algum desses fatores?`;
  }

  if (lowerMessage.includes("template") || lowerMessage.includes("gerar")) {
    return `Baseado em casos similares (LOC-G + RE em aeronaves monomotoras), sugiro o seguinte template para a seção:

**Análise do Evento:**
[Descrição factual da sequência de eventos]

**Fatores Identificados:**
[Lista de fatores contribuintes/condicionantes]

**Referências Normativas:**
[Citações de NSCAs e regulamentos aplicáveis]

Deseja que eu preencha este template com os dados da ocorrência?`;
  }

  return `Entendi sua solicitação. Baseado nos dados da ocorrência A-092/CENIPA/2024 e nas normas SIPAER vigentes, posso ajudá-lo com:

- Revisão técnica do texto
- Sugestões de estruturação
- Verificação de conformidade normativa
- Tradução técnica

Como posso ajudar especificamente?`;
}
