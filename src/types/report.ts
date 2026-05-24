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
  dateTime: Date;
  classification: OccurrenceClassification;
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

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
  isLoading?: boolean;
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
  avatar?: string;
}
