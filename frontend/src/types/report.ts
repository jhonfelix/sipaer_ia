// Tipos para o sistema SIPAER AI

export type ReportStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published";

export type OccurrenceClassification =
  | "ACIDENTE"
  | "INCIDENTE_GRAVE"
  | "INCIDENTE";

export type OccurrenceType =
  | "LOC-G" // Perda de controle no solo
  | "LOC-I" // Perda de controle em voo
  | "RE"    // Excursão de pista
  | "CFIT"  // Controlled Flight Into Terrain
  | "MAC"   // Colisão em voo
  | "GCOL"  // Colisão no solo
  | "F-NI"  // Fogo/Fumaça não relacionado a impacto
  | "FUEL"  // Combustível
  | "SCF-NP" // Falha de sistema não propulsivo
  | "SCF-PP" // Falha de sistema propulsivo
  | "BIRD"  // Colisão com pássaro
  | "TURB"  // Turbulência
  | "WSTRW" // Windshear
  | "UNK";  // Desconhecido

export interface Aircraft {
  registration: string;       // PP-XXX
  model: string;             // CESSNA 172M
  manufacturer: string;      // CESSNA
  serialNumber: string;
  category: string;          // Avião, Helicóptero, etc.
  yearOfManufacture: number;
  totalFlightHours: number;
  operator: string;
  damage: "NENHUM" | "LEVE" | "SUBSTANCIAL" | "DESTRUÍDA";
}

export interface Location {
  aerodrome?: string;        // SBGR
  aerodromeName?: string;    // Guarulhos
  municipality: string;
  state: string;
  coordinates: {
    latitude: string;        // 04°57'34"S
    longitude: string;       // 042°47'35"W
  };
}

export interface Crew {
  role: "PILOTO" | "COPILOTO" | "MECÂNICO" | "COMISSÁRIO";
  totalHours: number;
  hoursInModel: number;
  license: string;
  validCMA: boolean;
  fatality: boolean;
  injury: "NENHUMA" | "LEVE" | "GRAVE" | "FATAL";
}

export interface WeatherConditions {
  type: "VMC" | "IMC";
  wind: {
    direction: number;       // graus
    speed: number;           // kt
    gust?: number;
  };
  visibility: number;        // metros
  clouds: string;
  phenomena?: string;
  metar?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  order: number;
  content: string;
  isCompleted: boolean;
  subsections?: ReportSubsection[];
}

export interface ReportSubsection {
  id: string;
  title: string;
  order: number;
  content: string;
  isCompleted: boolean;
}

export interface Occurrence {
  id: string;
  sumaNumber: string;         // A-092/CENIPA/2024
  investigationUnit: string;  // SERIPA II
  investigator?: string;      // Investigador encarregado
  dateTime: Date;
  classification: OccurrenceClassification;
  occurrenceType?: OccurrenceType;
  types: OccurrenceType[];
  location: Location;
  aircraft: Aircraft[];
  crew: Crew[];
  weather: WeatherConditions;
  passengers: {
    total: number;
    fatalities: number;
    serious: number;
    minor: number;
    none: number;
  };
  thirdParty: {
    fatalities: number;
    serious: number;
    minor: number;
  };
}

export interface Report {
  id: string;
  occurrence: Occurrence;
  status: ReportStatus;
  version: number;
  generationStatus?: "pending" | "generating" | "done" | "failed" | null;
  sections: ReportSection[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastEditedBy: string;
  progress: {
    total: number;
    completed: number;
  };
}

export interface AISource {
  source: string;
  score: number;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: AISource[];
  sessionId?: string;
  isLoading?: boolean;
  attachments?: string[];
}

export interface AIQuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "investigator" | "reviewer" | "manager" | "admin";
  unit: string;
  postoGraduacao?: string;
  avatar?: string;
}

// ── Projetos ──────────────────────────────────────────────────────────────────

export type ProjectScope = "general" | "da";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  instructions: string | null;
  chatType: ProjectScope;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDocument {
  id: number;
  projectId: number;
  title: string;
  source: string;
  status: "pending" | "indexing" | "indexed" | "error";
  chunkCount: number;
  originalName: string | null;
  sizeBytes: number;
  errorMsg: string | null;
  addedBy: number;
  createdAt: Date;
  updatedAt: Date;
}
