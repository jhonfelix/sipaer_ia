"use client";

import { useRef, useEffect } from "react";
import { viridisColor, formatTime, type AcousticEvent } from "./shared";

export interface RPMPoint { time: number; rpm: number; }
export interface BandPower { time: number; low: number; mid: number; high: number; }

const BASE_RPM = 2680;

// ─── Engine Spectrogram ────────────────────────────────────────────────────

export function EngineSpectrogramCanvas({ data, cols, rows, events, duration }: {
  data: Float32Array; cols: number; rows: number; events: AcousticEvent[]; duration: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(cols, rows);
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const [r, g, b] = viridisColor(Math.min(1, Math.max(0, data[x * rows + y])));
        const idx = ((rows - 1 - y) * cols + x) * 4;
        img.data[idx] = r; img.data[idx + 1] = g; img.data[idx + 2] = b; img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    for (const ev of events) {
      const x = Math.floor((ev.timestamp / duration) * cols);
      const color = ev.severity === "critico" ? "rgba(239,68,68,0.8)" : ev.severity === "alto" ? "rgba(249,115,22,0.7)" : "rgba(245,158,11,0.6)";
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rows); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "9px monospace";
    for (const f of [0, 500, 1000, 2000, 4000, 8000]) {
      const y = rows - 1 - Math.floor((f / 22050) * rows);
      ctx.fillText(f >= 1000 ? f / 1000 + "k" : String(f), cols - 26, y + 4);
    }
    ctx.fillStyle = "rgba(253,231,37,0.6)"; ctx.font = "8px monospace";
    const f0 = BASE_RPM / 60;
    for (let h = 1; h <= 5; h++) {
      const freq = f0 * h;
      const y = rows - 1 - Math.floor((freq / 22050) * rows);
      if (y > 5 && y < rows - 5) ctx.fillText(`${h}×`, 4, y + 4);
    }
  }, [data, cols, rows, events, duration]);
  return <canvas ref={ref} width={cols} height={rows} className="w-full rounded-lg" style={{ height: "200px", imageRendering: "pixelated" }} />;
}

// ─── RPM Chart ─────────────────────────────────────────────────────────────

export function RPMChart({ data, duration, events }: { data: RPMPoint[]; duration: number; events: AcousticEvent[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    const MAX_RPM = 3000;
    ctx.fillStyle = "#070f1c"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "8px monospace";
      ctx.fillText(String(Math.round(MAX_RPM - (i / 6) * MAX_RPM)), 2, y + 4);
    }
    for (const ev of events) {
      if (ev.type === "normal") continue;
      const x = (ev.timestamp / duration) * W;
      ctx.strokeStyle = ev.severity === "critico" ? "rgba(239,68,68,0.5)" : "rgba(249,115,22,0.4)";
      ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2; ctx.beginPath();
    let started = false;
    for (const pt of data) {
      const x = (pt.time / duration) * W;
      const y = H - (pt.rpm / MAX_RPM) * H;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(6,182,212,0.08)"; ctx.beginPath();
    started = false;
    for (const pt of data) {
      const x = (pt.time / duration) * W;
      const y = H - (pt.rpm / MAX_RPM) * H;
      if (!started) { ctx.moveTo(x, H); ctx.lineTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    if (data.length) ctx.lineTo((data[data.length - 1].time / duration) * W, H);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "8px monospace";
    for (let i = 0; i <= 8; i++) ctx.fillText(formatTime((i / 8) * duration), (i / 8) * W + 2, H - 2);
  }, [data, duration, events]);
  return <canvas ref={ref} width={1200} height={80} className="w-full h-[80px] rounded-lg" />;
}

// ─── Band Power Chart ──────────────────────────────────────────────────────

export function BandPowerChart({ data, duration }: { data: BandPower[]; duration: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    ctx.fillStyle = "#070f1c"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = (i / 4) * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const draw = (key: keyof Omit<BandPower, "time">, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
      let s = false;
      for (const pt of data) {
        const x = (pt.time / duration) * W;
        const y = H - (pt[key] as number) * H;
        if (!s) { ctx.moveTo(x, y); s = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    draw("low", "rgba(99,102,241,0.7)");
    draw("mid", "rgba(6,182,212,0.8)");
    draw("high", "rgba(251,146,60,0.7)");
    ctx.font = "9px monospace";
    [
      { label: "Estrutural (0–200 Hz)", color: "rgba(99,102,241,0.9)", x: 8 },
      { label: "Motor (200–2k Hz)", color: "rgba(6,182,212,0.9)", x: 165 },
      { label: "Aerodinâmico (2k+ Hz)", color: "rgba(251,146,60,0.9)", x: 305 },
    ].forEach(l => { ctx.fillStyle = l.color; ctx.fillText(l.label, l.x, 12); });
  }, [data, duration]);
  return <canvas ref={ref} width={1200} height={70} className="w-full h-[70px] rounded-lg" />;
}

// ─── Data Generators ────────────────────────────────────────────────────────

export function generateEngineSpectro(cols: number, rows: number, rng: () => number, events: AcousticEvent[], dur: number): Float32Array {
  const data = new Float32Array(cols * rows);
  const fMax = 22050;
  for (let x = 0; x < cols; x++) {
    const t = (x / cols) * dur;
    let rpmNow = BASE_RPM;
    if (t >= 17.8 && t < 38.7) rpmNow = Math.max(200, BASE_RPM - 820 * Math.min(1, (t - 17.8) / 2));
    if (t >= 38.7) rpmNow = 0;
    const noise = 0.05 + rng() * 0.04;
    for (let y = 0; y < rows; y++) data[x * rows + y] = noise + rng() * 0.03;
    if (rpmNow > 0) {
      const f0 = rpmNow / 60;
      for (let h = 1; h <= 8; h++) {
        const freq = f0 * h; const bin = Math.floor((freq / fMax) * rows); if (bin >= rows) break;
        const amp = (0.8 / Math.sqrt(h)) + rng() * 0.05;
        for (let db = -2; db <= 2; db++) {
          const b = bin + db;
          if (b >= 0 && b < rows) data[x * rows + b] = Math.min(1, data[x * rows + b] + amp * Math.exp(-(db * db) / 1.5));
        }
      }
      for (let y = Math.floor(rows * 0.5); y < rows; y++) data[x * rows + y] += 0.08 * (rng() - 0.3) * (rpmNow / BASE_RPM);
      for (let y = 0; y < Math.floor(rows * 0.05); y++) data[x * rows + y] += 0.15 + rng() * 0.05;
    }
    for (const ev of events) {
      if (Math.abs(t - ev.timestamp) < 0.3) {
        if (ev.type === "vibracao_estrutural") {
          const bin = Math.floor((112 / fMax) * rows);
          for (let db = -4; db <= 4; db++) { const b = bin + db; if (b >= 0 && b < rows) data[x * rows + b] = Math.min(1, data[x * rows + b] + 0.7 * Math.exp(-(db * db) / 5)); }
        }
        if (ev.type === "alarme_cabine") {
          const bin = Math.floor((3500 / fMax) * rows);
          for (let db = -2; db <= 2; db++) { const b = bin + db; if (b >= 0 && b < rows) data[x * rows + b] = Math.min(1, data[x * rows + b] + 0.9); }
        }
        if (ev.type === "impacto") for (let y = 0; y < rows; y++) data[x * rows + y] = Math.min(1, data[x * rows + y] + 0.6 + rng() * 0.35);
      }
    }
  }
  return data;
}

export function generateRPMCurve(points: number, dur: number): RPMPoint[] {
  return Array.from({ length: points }, (_, i) => {
    const t = (i / points) * dur;
    let rpm = BASE_RPM + (Math.random() - 0.5) * 30;
    if (t >= 17.8 && t < 38.7) rpm = Math.max(180, BASE_RPM - 820 * Math.min(1, (t - 17.8) / 2) + (Math.random() - 0.5) * 40);
    if (t >= 38.7) rpm = 0;
    return { time: t, rpm };
  });
}

export function generateBandPower(points: number, dur: number, rng: () => number): BandPower[] {
  return Array.from({ length: points }, (_, i) => {
    const t = (i / points) * dur;
    const hasEngine = t < 38.7;
    const rpmFactor = t >= 17.8 && t < 38.7 ? Math.max(0.2, 1 - (t - 17.8) / 25) : (hasEngine ? 1 : 0);
    return {
      time: t,
      low: (0.3 + rng() * 0.1) * rpmFactor,
      mid: (0.7 + rng() * 0.15) * rpmFactor,
      high: (0.35 + rng() * 0.1) * rpmFactor + (t >= 44.1 && t < 44.5 ? 0.8 : 0),
    };
  });
}
