# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SIPAER AI is a Next.js application for managing aviation incident/accident investigation reports following SIPAER (Sistema de Investigação e Prevenção de Acidentes Aeronáuticos) standards. It features a rich text editor with AI assistance.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16.1.2 with App Router, React 19.2.3
- **Language**: TypeScript 5 (strict mode, path alias `@/*` → `./src/*`)
- **Styling**: TailwindCSS 4 with CSS variables (OKLch color space), dark mode default
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives
- **Rich Text Editor**: TipTap v3.15.3 with table, link, highlight extensions
- **Icons**: Lucide React
- **Theme**: next-themes

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with ThemeProvider
│   ├── page.tsx            # Home (redirects to /reports)
│   ├── globals.css         # Global styles + TipTap editor CSS
│   └── (app)/              # Route group for authenticated pages
│       ├── layout.tsx      # App layout with Header
│       └── reports/        # Report editing interface
│
├── components/
│   ├── layout/             # Header, navigation
│   ├── report/             # ReportEditor, ReportSidebar, AIAssistantPanel, EditorToolbar
│   ├── providers/          # ThemeProvider
│   └── ui/                 # shadcn/ui components (30+)
│
├── hooks/                  # Custom hooks (use-toast)
├── lib/
│   ├── utils.ts            # cn() for class merging (clsx + tailwind-merge)
│   └── mocks/              # Mock data for development
└── types/
    └── report.ts           # Domain types (Report, ReportSection, Occurrence, User, etc.)
```

## Key Patterns

- **Client Components**: Interactive components use `"use client"` directive
- **Barrel Exports**: Components organized with `index.ts` re-exports
- **Class Utility**: Use `cn()` from `@/lib/utils` for conditional class merging
- **State Management**: Local component state with hooks (no global state library)
- **Three-Panel Layout**: Sidebar (navigation) + Editor (main) + AI Assistant (right)

## Domain Types

Located in `src/types/report.ts`:
- `Report`: Main document with hierarchical sections/subsections
- `ReportSection` / `ReportSubsection`: Content structure with HTML content
- `Occurrence`: Aviation incident data (aircraft, crew, location, weather)
- `User`: Profile with roles (investigator, reviewer, manager, admin)
- `ReportStatus`: draft, in_review, approved, published
- `OccurrenceType`: Aviation-specific codes (LOC-G, LOC-I, RE, CFIT, MAC, etc.)

## Conventions

- Handler functions prefixed with `handle` (e.g., `handleSave`, `handleSectionChange`)
- Import components from barrel exports: `import { ReportEditor } from "@/components/report"`
- Keyboard shortcuts: Ctrl+S saves report
- Toast notifications for user feedback (success, warning, destructive variants)
- Language: Portuguese-Brazil (pt-BR) for UI, prepared for multilingual export

## Database (Planned)

Prisma ORM with MySQL 8 is planned. See `prisma_exemplo.txt` for schema draft with models: User, Report, ReportVersion, ReportTemplate, ReportComment, AuditLog.
