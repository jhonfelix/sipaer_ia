# SIPAER AI - Memória do Projeto

## Domínio
- Geração de relatórios finais de acidentes aeronáuticos (padrão SIPAER)
- Ocorrências frequentemente envolvem **aeronaves agrícolas** (aviação agrícola)

## Stack
- Next.js 16 + React 19, TypeScript strict, TailwindCSS 4, shadcn/ui (new-york)
- TipTap v3 como editor rich text
- Prisma + MySQL 8 (planejado, ainda não implementado)

## Estrutura relevante
- `src/types/report.ts` — tipos de domínio (Report, Occurrence, OccurrenceType, etc.)
- `src/lib/mocks/report-data.ts` — dados mockados para desenvolvimento
- `src/components/report/` — ReportEditor, ReportSidebar, AIAssistantPanel, EditorToolbar
- `src/app/(app)/reports/page.tsx` — lista de relatórios
