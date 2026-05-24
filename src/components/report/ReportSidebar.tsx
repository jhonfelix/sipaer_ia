"use client";

import { useState } from "react";
import {
  ChevronRight,
  FileText,
  Clock,
  Search,
  Settings,
  Circle,
  CheckCircle2,
  Shield,
  AlertCircle,
  TriangleAlert,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Report, ReportSection, ReportSubsection } from "@/types/report";

interface ReportSidebarProps {
  report: Report;
  activeSection: string;
  activeSubsection: string;
  onSectionChange: (sectionId: string, subsectionId?: string) => void;
}

const sectionIcons: Record<number, React.ReactNode> = {
  1: <FileText className="w-4 h-4" />,
  2: <Clock className="w-4 h-4" />,
  3: <Settings className="w-4 h-4" />,
  4: <CheckCircle2 className="w-4 h-4" />,
  5: <TriangleAlert className="w-4 h-4" />,
  6: <Shield className="w-4 h-4" />,
};

function getCompletedCount(section: ReportSection): number {
  if (!section.subsections) return section.isCompleted ? 1 : 0;
  return section.subsections.filter((s) => s.isCompleted).length;
}

function getTotalCount(section: ReportSection): number {
  return section.subsections?.length || 1;
}

export function ReportSidebar({
  report,
  activeSection,
  activeSubsection,
  onSectionChange,
}: ReportSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    report.sections[0]?.id || "",
  ]);

  const occurrence = report.occurrence;
  const progressPercentage = Math.round(
    (report.progress.completed / report.progress.total) * 100
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSubsectionClick = (sectionId: string, subsectionId: string) => {
    onSectionChange(sectionId, subsectionId);
    if (!expandedSections.includes(sectionId)) {
      setExpandedSections((prev) => [...prev, sectionId]);
    }
  };

  return (
    <aside className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 h-full overflow-hidden">
      {/* Cabeçalho do Relatório */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
          <h2 className="font-semibold text-sm">Relatório Técnico</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Conforme normas SIPAER
        </p>

        {/* Info da Ocorrência */}
        <div className="space-y-1">
          <p className="text-xs font-medium">
            {occurrence.aircraft[0]?.registration} - {occurrence.classification}{" "}
            - {occurrence.dateTime.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground">
            {occurrence.aircraft[0]?.manufacturer} {occurrence.aircraft[0]?.model} - {occurrence.location.aerodromeName || "Local"}/{occurrence.location.state}
          </p>
        </div>
      </div>

      {/* Lista de Seções */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {report.sections.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            const isActive = activeSection === section.id;
            const completed = getCompletedCount(section);
            const total = getTotalCount(section);
            const isFullyCompleted = completed === total;

            return (
              <div key={section.id} className="mb-1">
                {/* Cabeçalho da Seção */}
                <button
                  onClick={() => {
                    toggleSection(section.id);
                    if (!section.subsections?.length) {
                      onSectionChange(section.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                    isActive && !activeSubsection
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-sidebar-accent"
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 shrink-0 transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                  <span
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center shrink-0 text-xs",
                      isFullyCompleted
                        ? "bg-green-500/20 text-green-500"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {sectionIcons[section.order] || section.order}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">
                    {section.order}. {section.title}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      isFullyCompleted
                        ? "bg-green-500/20 text-green-500"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {completed}/{total}
                  </span>
                </button>

                {/* Subseções */}
                {isExpanded && section.subsections && (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-sidebar-border pl-2">
                    {section.subsections.map((subsection) => {
                      const isSubActive =
                        activeSection === section.id &&
                        activeSubsection === subsection.id;

                      return (
                        <button
                          key={subsection.id}
                          onClick={() =>
                            handleSubsectionClick(section.id, subsection.id)
                          }
                          className={cn(
                            "w-full flex items-start gap-2 px-2 py-1.5 rounded text-left transition-colors",
                            isSubActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-sidebar-accent"
                          )}
                        >
                          {subsection.isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">
                              {subsection.title}
                            </p>
                            {subsection.content && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {subsection.content
                                  .replace(/<[^>]*>/g, "")
                                  .slice(0, 40)}
                                ...
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Progresso */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Progresso do Relatório
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">
            {report.progress.completed}
          </span>
          <span className="text-xs text-muted-foreground">
            / {report.progress.total} seções
          </span>
          <span className="text-sm font-medium text-primary ml-auto">
            {progressPercentage}%
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2 mt-2" />
        <p className="text-[10px] text-muted-foreground mt-2">
          {report.progress.total - report.progress.completed} seções restantes
          para conclusão
        </p>
      </div>
    </aside>
  );
}
