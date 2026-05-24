// Shared utilities for LabData analysis pages

export function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

export function formatBytes(b: number) {
  return (b / 1_048_576).toFixed(1) + " MB";
}

// Inferno colormap (for audio forensic spectrogram)
export function infernoColor(v: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.00, [10, 8, 30]],
    [0.15, [40, 11, 84]],
    [0.30, [101, 21, 110]],
    [0.45, [159, 42, 99]],
    [0.60, [212, 72, 66]],
    [0.75, [245, 125, 21]],
    [0.90, [254, 188, 43]],
    [1.00, [252, 255, 164]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const t = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      const a = stops[i - 1][1], b = stops[i][1];
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ];
    }
  }
  return [252, 255, 164];
}

// Viridis colormap (for spectral engine analysis)
export function viridisColor(v: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.00, [68, 1, 84]],
    [0.15, [72, 40, 120]],
    [0.30, [62, 83, 160]],
    [0.45, [49, 120, 172]],
    [0.60, [53, 183, 121]],
    [0.80, [109, 205, 89]],
    [0.95, [180, 222, 44]],
    [1.00, [253, 231, 37]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const t = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      const a = stops[i - 1][1], b = stops[i][1];
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ];
    }
  }
  return [253, 231, 37];
}

// ─── Audio forensic types ───────────────────────────────────────────────────

export interface AudioAnomaly {
  id: string;
  timestamp: number;
  endTimestamp: number;
  type: "corte" | "ambiente" | "compressao" | "ruido_artificial" | "voz_sintetica";
  severity: "alta" | "media" | "baixa";
  confidence: number;
  description: string;
  technical: string;
}

export const ANOMALY_TYPE_LABEL: Record<AudioAnomaly["type"], string> = {
  corte: "Corte / Edição",
  ambiente: "Mudança de Ambiente",
  compressao: "Compressão Diferente",
  ruido_artificial: "Ruído Artificial",
  voz_sintetica: "Voz Sintética",
};

export const SEVERITY_COLORS = {
  alta: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400", bar: "bg-red-500" },
  media: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400", bar: "bg-amber-500" },
  baixa: { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", dot: "bg-indigo-400", bar: "bg-indigo-500" },
};

// ─── Spectral / acoustic event types ────────────────────────────────────────

export interface AcousticEvent {
  id: string;
  timestamp: number;
  type: "motor_queda_rpm" | "impacto" | "alarme_cabine" | "vibracao_estrutural" | "perda_potencia" | "normal";
  severity: "critico" | "alto" | "medio" | "info";
  label: string;
  description: string;
  freqPeak?: number;
  deltaRPM?: number;
  technical: string;
}

export const SEV_COLORS = {
  critico: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
  alto: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-500" },
  medio: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500" },
  info: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500" },
};
