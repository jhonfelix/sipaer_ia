import {
  FolderKanban,
  Plane,
  FileSearch,
  Scale,
  ShieldAlert,
  Wrench,
  BookOpen,
  ClipboardList,
  Radar,
  Gauge,
  Building2,
  Landmark,
  FileText,
  Search,
  AlertTriangle,
  Boxes,
  type LucideIcon,
} from "lucide-react";

// Paleta de cores dos projetos (hex — usada como accent no ícone/cabeçalho)
export const PROJECT_COLORS: string[] = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
  "#f97316", // orange
];

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

// Ícones disponíveis para projetos (subconjunto curado do lucide-react)
export const PROJECT_ICONS: Record<string, LucideIcon> = {
  "folder-kanban": FolderKanban,
  plane: Plane,
  "file-search": FileSearch,
  scale: Scale,
  "shield-alert": ShieldAlert,
  wrench: Wrench,
  "book-open": BookOpen,
  "clipboard-list": ClipboardList,
  radar: Radar,
  gauge: Gauge,
  "building-2": Building2,
  landmark: Landmark,
  "file-text": FileText,
  search: Search,
  "alert-triangle": AlertTriangle,
  boxes: Boxes,
};

export const DEFAULT_PROJECT_ICON = "folder-kanban";

export function resolveProjectIcon(icon: string | null | undefined): LucideIcon {
  return (icon && PROJECT_ICONS[icon]) || PROJECT_ICONS[DEFAULT_PROJECT_ICON];
}
