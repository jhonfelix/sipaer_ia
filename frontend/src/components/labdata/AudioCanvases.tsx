"use client";

import { useRef, useEffect } from "react";
import { infernoColor, formatTime, type AudioAnomaly } from "./shared";

export interface MFCCFrame { coefficients: number[]; }

// ─── Waveform ──────────────────────────────────────────────────────────────

export function WaveformCanvas({ waveform, anomalies, duration, playhead }: {
  waveform: Float32Array; anomalies: AudioAnomaly[]; duration: number; playhead: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    ctx.fillStyle = "#070f1c"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    for (const a of anomalies) {
      ctx.fillStyle = a.severity === "alta" ? "rgba(239,68,68,0.10)" : a.severity === "media" ? "rgba(245,158,11,0.08)" : "rgba(99,102,241,0.07)";
      ctx.fillRect((a.timestamp / duration) * W, 0, ((a.endTimestamp - a.timestamp) / duration) * W, H);
    }
    ctx.strokeStyle = "#8b5cf6"; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < W; i++) {
      const y = H / 2 + waveform[Math.floor((i / W) * waveform.length)] * (H / 2 - 6);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(139,92,246,0.2)"; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let i = 0; i < W; i++) {
      const y = H / 2 - waveform[Math.floor((i / W) * waveform.length)] * (H / 2 - 6);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
    for (const a of anomalies) {
      const x = (a.timestamp / duration) * W;
      const color = a.severity === "alta" ? "#ef4444" : a.severity === "media" ? "#f59e0b" : "#818cf8";
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = color; ctx.font = "9px monospace";
      ctx.fillText(formatTime(a.timestamp), x + 3, 11);
    }
    if (playhead > 0) {
      const px = (playhead / duration) * W;
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "9px monospace";
    for (let i = 0; i <= 10; i++)
      ctx.fillText(formatTime((i / 10) * duration), (i / 10) * W + 2, H - 4);
  }, [waveform, anomalies, duration, playhead]);
  return <canvas ref={ref} width={1200} height={100} className="w-full h-[100px] rounded-lg" />;
}

// ─── Spectrogram ───────────────────────────────────────────────────────────

export function AudioSpectrogramCanvas({ data, cols, rows, anomalies, duration }: {
  data: Float32Array; cols: number; rows: number; anomalies: AudioAnomaly[]; duration: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(cols, rows);
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const [r, g, b] = infernoColor(Math.min(1, Math.max(0, data[x * rows + y])));
        const idx = ((rows - 1 - y) * cols + x) * 4;
        img.data[idx] = r; img.data[idx + 1] = g; img.data[idx + 2] = b; img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    for (const a of anomalies) {
      const x0 = Math.floor((a.timestamp / duration) * cols);
      const x1 = Math.floor((a.endTimestamp / duration) * cols);
      ctx.strokeStyle = a.severity === "alta" ? "rgba(239,68,68,0.6)" : "rgba(245,158,11,0.5)";
      ctx.lineWidth = 1.5; ctx.strokeRect(x0, 0, x1 - x0, rows);
    }
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px monospace";
    for (const f of [0, 2000, 4000, 8000, 11025]) {
      const y = rows - 1 - Math.floor((f / 22050) * rows);
      ctx.fillText(f >= 1000 ? f / 1000 + "k" : String(f), cols - 26, y + 4);
    }
  }, [data, cols, rows, anomalies, duration]);
  return <canvas ref={ref} width={cols} height={rows} className="w-full rounded-lg" style={{ height: "180px", imageRendering: "pixelated" }} />;
}

// ─── MFCC Heatmap ──────────────────────────────────────────────────────────

export function MFCCHeatmap({ frames }: { frames: MFCCFrame[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 600; const COEFS = 13;
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const cw = W / frames.length, ch = c.height / COEFS;
    for (let f = 0; f < frames.length; f++) {
      for (let ci = 0; ci < COEFS; ci++) {
        const [r, g, b] = infernoColor(Math.max(0, Math.min(1, (frames[f].coefficients[ci] + 15) / 30)));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(Math.floor(f * cw), Math.floor((COEFS - 1 - ci) * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
      }
    }
  }, [frames]);
  return <canvas ref={ref} width={W} height={COEFS * 10} className="w-full rounded" style={{ height: `${COEFS * 10}px`, imageRendering: "pixelated" }} />;
}

// ─── Data Generators ────────────────────────────────────────────────────────

export function generateWaveform(samples: number, rng: () => number, anomalies: AudioAnomaly[]): Float32Array {
  const data = new Float32Array(samples);
  let phase = 0;
  for (let i = 0; i < samples; i++) {
    phase += 0.08 + rng() * 0.005;
    const base = Math.sin(phase) * (0.4 + rng() * 0.3) + Math.sin(phase * 2.3) * 0.15 + Math.sin(phase * 5.1) * 0.08 + (rng() - 0.5) * 0.05;
    data[i] = Math.max(-1, Math.min(1, base));
  }
  for (const a of anomalies) {
    const s0 = Math.floor((a.timestamp / 65) * samples);
    const s1 = Math.floor((a.endTimestamp / 65) * samples);
    for (let i = s0; i < s1 && i < samples; i++) {
      if (a.type === "corte") data[i] = (rng() - 0.5) * 0.02;
      else if (a.type === "ruido_artificial") { data[i] += (rng() - 0.5) * 1.2; data[i] = Math.max(-1, Math.min(1, data[i])); }
    }
  }
  return data;
}

export function generateAudioSpectro(cols: number, rows: number, rng: () => number, anomalies: AudioAnomaly[], dur: number): Float32Array {
  const data = new Float32Array(cols * rows);
  for (let x = 0; x < cols; x++) {
    const noise = rng() * 0.08;
    const f0bin = Math.floor((80 + rng() * 60) / 22050 * rows);
    for (let h = 1; h <= 10; h++) {
      const bin = f0bin * h; if (bin >= rows) break;
      const amp = (0.75 / h) + rng() * 0.08;
      for (let db = -3; db <= 3; db++) {
        const b = bin + db;
        if (b >= 0 && b < rows) data[x * rows + b] = Math.min(1, data[x * rows + b] + amp * Math.exp(-(db * db) / 3));
      }
    }
    for (let y = 0; y < rows; y++) data[x * rows + y] += noise + rng() * 0.04;
    for (let y = 0; y < Math.floor(rows * 0.1); y++) data[x * rows + y] += 0.1 * (1 - y / (rows * 0.1));
  }
  for (const a of anomalies) {
    const x0 = Math.floor((a.timestamp / dur) * cols);
    const x1 = Math.floor((a.endTimestamp / dur) * cols);
    for (let x = x0; x < x1 && x < cols; x++) {
      if (a.type === "corte") for (let y = 0; y < rows; y++) data[x * rows + y] *= 0.05;
      else if (a.type === "ambiente") for (let y = Math.floor(rows * 0.3); y < rows; y++) data[x * rows + y] += rng() * 0.3;
      else if (a.type === "compressao") for (let y = Math.floor(rows * 0.6); y < rows; y++) data[x * rows + y] *= 0.25 + rng() * 0.15;
      else if (a.type === "ruido_artificial") for (let y = 0; y < rows; y++) data[x * rows + y] += rng() * 0.6;
    }
  }
  return data;
}

export function generateMFCC(frames: number, rng: () => number, anomalies: AudioAnomaly[], dur: number): MFCCFrame[] {
  return Array.from({ length: frames }, (_, fi) => {
    const t = (fi / frames) * dur;
    const inA = anomalies.some(a => t >= a.timestamp && t <= a.endTimestamp);
    return {
      coefficients: Array.from({ length: 13 }, (__, ci) => {
        const base = ci === 0 ? -12 + rng() * 4 : (rng() - 0.5) * (8 - ci * 0.4);
        return inA ? base * (0.3 + rng() * 0.4) : base;
      }),
    };
  });
}
