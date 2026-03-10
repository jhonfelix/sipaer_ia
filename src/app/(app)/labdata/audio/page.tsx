"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  AudioWaveform as Waveform, Upload, Play, Pause, Square,
  AlertTriangle, CheckCircle2, Info, Cpu, Activity, BarChart3,
  FileAudio, Sparkles, Clock, Layers, ChevronDown, ChevronUp,
  Download, RefreshCw, XCircle, Mic, Smartphone, Headphones, Radio, ArrowLeft,
} from "lucide-react";
import {
  makeRng, formatTime, formatBytes,
  ANOMALY_TYPE_LABEL, SEVERITY_COLORS, type AudioAnomaly,
} from "@/components/labdata/shared";
import {
  WaveformCanvas, AudioSpectrogramCanvas, MFCCHeatmap,
  generateWaveform, generateAudioSpectro, generateMFCC,
} from "@/components/labdata/AudioCanvases";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const ANOMALIES: AudioAnomaly[] = [
  { id: "a1", timestamp: 14.1, endTimestamp: 14.6, type: "corte", severity: "alta", confidence: 96, description: "Corte abrupto detectado", technical: "Descontinuidade de fase zero em 00:14.1. Transição de energia RMS de −42 dBFS para −78 dBFS em menos de 1 quadro (23 ms). Ausência de reverberação residual indica edição cirúrgica." },
  { id: "a2", timestamp: 28.5, endTimestamp: 30.1, type: "ambiente", severity: "media", confidence: 83, description: "Mudança de ambiente acústico", technical: "Alteração no perfil de reverberação entre 00:28.5 e 00:30.1. RT60 estimado cai de 340 ms para 95 ms. SNR do ruído de fundo aumenta +11 dB, sugerindo splice entre dois ambientes distintos." },
  { id: "a3", timestamp: 41.0, endTimestamp: 42.8, type: "compressao", severity: "media", confidence: 78, description: "Compressão diferente entre trechos", technical: "Supressão de componentes acima de 9.8 kHz a partir de 00:41.0. Bits fantasmas no espectro de alta frequência indicam recompressão MP3 sobre sinal já comprimido. Taxa: 64 kbps vs 192 kbps no restante." },
  { id: "a4", timestamp: 53.2, endTimestamp: 54.0, type: "ruido_artificial", severity: "baixa", confidence: 65, description: "Ruído artificial inserido", technical: "Espectro plano (white noise) inserido em 00:53.2 com modulação periódica a 120 Hz. Não condizente com ruído orgânico. Possível mascaramento intencional." },
];

const FILE = { name: "CVR_GRAVACAO_OC2024_0312.wav", size: 48_230_400, duration: 65.4, sampleRate: 44100, channels: 2, format: "WAV PCM", bitDepth: 24 };

const STEPS = [
  { id: "d", label: "Decodificação do áudio", detail: "PCM 24-bit / 44.1 kHz" },
  { id: "f", label: "FFT — Análise espectral global", detail: "N=4096, janela Hann" },
  { id: "s", label: "STFT — Espectrograma tempo-frequência", detail: "Hop=512, overlap 87.5%" },
  { id: "m", label: "Extração de MFCCs", detail: "13 coeficientes, 40 filtros Mel" },
  { id: "fe", label: "Pitch · Centroide · Flux · ZCR", detail: "Frame 23 ms" },
  { id: "an", label: "Detecção de anomalias forenses", detail: "Modelo CENIPA v2.1" },
  { id: "ai", label: "Interpretação pericial por IA", detail: "Análise contextual e laudo" },
];

// ─── Upload ─────────────────────────────────────────────────────────────────

function UploadZone({ onUpload }: { onUpload: () => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
            <Mic className="w-9 h-9 text-violet-400" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Análise Pericial de Áudio</h2>
          <p className="text-white/50 mt-2">Forense de integridade para CVR, FDR, celular e tablet.</p>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onUpload(); }} onClick={onUpload}
          className={`rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all group ${drag ? "border-violet-400/60 bg-violet-500/10" : "border-white/15 hover:border-violet-400/40 hover:bg-white/[0.02]"}`}>
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 transition-colors ${drag ? "text-violet-400" : "text-white/30 group-hover:text-violet-400"}`} />
            <p className="text-white/70 font-medium">Arraste o arquivo ou clique para selecionar</p>
            <p className="text-white/30 text-sm">WAV · MP3 · OGG — até 500 MB</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-left">
          {[{ icon: Headphones, label: "CVR", sub: "Cockpit Voice Recorder" }, { icon: Activity, label: "FDR", sub: "Flight Data Recorder" }, { icon: Smartphone, label: "Celular / Tablet", sub: "Gravações de campo" }, { icon: Radio, label: "Rádio", sub: "Comunicações ATC" }].map((s) => {
            const I = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-400/15 flex items-center justify-center shrink-0"><I className="w-4 h-4 text-violet-400" /></div>
                <div><p className="text-white/80 text-sm font-medium">{s.label}</p><p className="text-white/35 text-xs">{s.sub}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Processing ──────────────────────────────────────────────────────────────

function ProcessingView({ step }: { step: number }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center animate-pulse">
              <Cpu className="w-7 h-7 text-violet-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white">Processando áudio...</h3>
          <p className="text-white/40 text-sm">{step < STEPS.length ? STEPS[step].label : "Finalizando"}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/40"><span>Progresso</span><span>{Math.round((step / STEPS.length) * 100)}%</span></div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <div className="space-y-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${i < step ? "bg-emerald-500/5 border border-emerald-500/20" : i === step ? "bg-violet-500/10 border border-violet-400/30" : "bg-white/[0.02] border border-white/[0.06] opacity-40"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i < step ? "bg-emerald-500/20" : i === step ? "bg-violet-500/20 animate-pulse" : "bg-white/10"}`}>
                {i < step ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : i === step ? <RefreshCw className="w-3 h-3 text-violet-400 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
              </div>
              <div><p className={`text-sm font-medium ${i <= step ? "text-white" : "text-white/40"}`}>{s.label}</p><p className="text-xs text-white/30 font-mono">{s.detail}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function AnalysisView({ waveform, spectroData, mfccFrames, anomalies, onReset }: {
  waveform: Float32Array; spectroData: Float32Array; mfccFrames: ReturnType<typeof generateMFCC>; anomalies: AudioAnomaly[]; onReset: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [expanded, setExpanded] = useState<string | null>("a1");
  const highA = anomalies.filter(a => a.severity === "alta").length;
  const medA = anomalies.filter(a => a.severity === "media").length;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setPlayhead(p => { if (p >= FILE.duration) { setPlaying(false); return 0; } return p + 0.1; }), 100);
    return () => clearInterval(t);
  }, [playing]);

  const features = [
    { label: "Pitch médio (F0)", value: "187.3", unit: "Hz", sub: "Variação: ±42.1 Hz", color: "#8b5cf6" },
    { label: "Centroide Espectral", value: "2.847", unit: "kHz", sub: "σ = 0.41 kHz", color: "#a78bfa" },
    { label: "Spectral Flux", value: "0.0342", unit: "", sub: "Norma L1 inter-frames", color: "#10b981" },
    { label: "Zero Crossing Rate", value: "0.118", unit: "/frame", sub: "Média 2.847 frames", color: "#f59e0b" },
    { label: "RMS Energy", value: "−18.4", unit: "dBFS", sub: "Peak: −3.2 dBFS", color: "#ef4444" },
    { label: "SNR estimado", value: "32.7", unit: "dB", sub: "PESQ-NB: 3.84", color: "#06b6d4" },
    { label: "Spectral Rolloff", value: "8.23", unit: "kHz", sub: "85% da energia", color: "#a78bfa" },
    { label: "Bitrate heterogêneo", value: "192/64", unit: "kbps", sub: "Inconsistência detectada", color: "#fb923c" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {/* Info bar */}
      <div className="sticky top-0 z-10 bg-[#0d1b2e]/95 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center gap-3 flex-wrap">
        <FileAudio className="w-4 h-4 text-violet-400" />
        <span className="text-white font-mono text-sm">{FILE.name}</span>
        <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/25 text-violet-300 text-xs font-mono">CVR</span>
        {[`${FILE.format}`, `${FILE.sampleRate / 1000} kHz`, `${FILE.bitDepth}-bit`, "Stereo", formatTime(FILE.duration), formatBytes(FILE.size)].map((v, i) => <span key={i} className="text-xs text-white/40 font-mono">{v}</span>)}
        <div className="ml-auto flex items-center gap-2">
          {highA > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs"><AlertTriangle className="w-3 h-3" />{highA} crítico</span>}
          {medA > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs"><Info className="w-3 h-3" />{medA} médio</span>}
          <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs transition-all"><XCircle className="w-3.5 h-3.5" />Novo arquivo</button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Waveform */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2"><Waveform className="w-4 h-4 text-violet-400" /><span className="text-white text-sm font-medium">Forma de Onda</span><span className="text-white/30 text-xs font-mono">PCM temporal</span></div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setPlaying(false); setPlayhead(0); }} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"><Square className="w-3 h-3 text-white/50" /></button>
              <button onClick={() => setPlaying(p => !p)} className="w-7 h-7 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 flex items-center justify-center transition-all">{playing ? <Pause className="w-3.5 h-3.5 text-violet-400" /> : <Play className="w-3.5 h-3.5 text-violet-400" />}</button>
              <span className="text-white/30 text-xs font-mono w-14 text-right">{formatTime(playhead)}</span>
            </div>
          </div>
          <div className="p-3"><WaveformCanvas waveform={waveform} anomalies={anomalies} duration={FILE.duration} playhead={playhead} /></div>
        </div>

        {/* Spectrogram */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-400" /><span className="text-white text-sm font-medium">Espectrograma STFT</span><span className="text-white/30 text-xs font-mono">0–22 kHz</span></div>
            <div className="flex items-center gap-3 text-xs font-mono text-white/30"><span>N=4096</span><span>Hop=512</span><span>Hann</span></div>
          </div>
          <div className="p-3 space-y-1">
            <AudioSpectrogramCanvas data={spectroData} cols={800} rows={200} anomalies={anomalies} duration={FILE.duration} />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/25 text-[10px]">−∞ dB</span>
              <div className="flex-1 h-2 rounded" style={{ background: "linear-gradient(to right,#0a081e,#281254,#651b6e,#9f2a63,#d44842,#f57d15,#febc2b,#fcffa4)" }} />
              <span className="text-white/25 text-[10px]">0 dB</span>
            </div>
          </div>
        </div>

        {/* Features + MFCC */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10"><Activity className="w-4 h-4 text-emerald-400" /><span className="text-white text-sm font-medium">Features Acústicas</span></div>
            <div className="grid grid-cols-2 gap-px bg-white/5">
              {features.map((f) => (
                <div key={f.label} className="p-4 bg-[#070f1c] hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-baseline gap-1.5"><span className="text-2xl font-bold font-mono" style={{ color: f.color }}>{f.value}</span>{f.unit && <span className="text-white/40 text-xs font-mono">{f.unit}</span>}</div>
                  <p className="text-white/50 text-xs mt-0.5">{f.label}</p><p className="text-white/25 text-[10px] font-mono">{f.sub}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-amber-400" /><span className="text-white text-sm font-medium">MFCCs — Heatmap</span><span className="text-white/30 text-xs font-mono">13 coef × frames</span></div>
            </div>
            <div className="p-4 space-y-3">
              <MFCCHeatmap frames={mfccFrames} />
              <div className="flex items-center gap-2"><span className="text-white/25 text-[10px]">−15</span><div className="flex-1 h-1.5 rounded" style={{ background: "linear-gradient(to right,#0a081e,#651b6e,#d44842,#febc2b,#fcffa4)" }} /><span className="text-white/25 text-[10px]">+15</span></div>
              <div className="grid grid-cols-3 gap-2">
                {[{ label: "C0 médio", value: "-10.3" }, { label: "Variância C1", value: "4.82" }, { label: "Delta MFCC", value: "0.031" }].map(s => (
                  <div key={s.label} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-amber-400 font-mono text-sm font-bold">{s.value}</p><p className="text-white/35 text-[10px]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Pericial */}
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-violet-400/15">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-violet-400" /></div>
              <div><p className="text-white font-semibold text-sm">Interpretação Pericial por IA</p><p className="text-white/35 text-xs font-mono">Modelo forense CENIPA v2.1</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">Confiança: 86%</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/20 text-violet-300 text-xs transition-all"><Download className="w-3.5 h-3.5" />Exportar laudo</button>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <p className="text-white/80 text-sm leading-relaxed">O arquivo apresenta <span className="text-red-400 font-medium">indícios consistentes de edição pós-gravação</span>. Foram identificadas <strong className="text-white">{anomalies.length} anomalias</strong> — {highA} de severidade alta e {medA} média. A análise de coerência espectral indica ruptura na cadeia de custódia acústica em ao menos dois pontos.</p>
            </div>
            <div className="space-y-3">
              {anomalies.map((a) => {
                const sc = SEVERITY_COLORS[a.severity];
                const isExp = expanded === a.id;
                return (
                  <div key={a.id} className={`rounded-xl border ${sc.bg} ${sc.border} overflow-hidden`}>
                    <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(isExp ? null : a.id)}>
                      <div className={`w-2 h-2 rounded-full ${sc.dot} shrink-0`} />
                      <div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-semibold ${sc.text}`}>{ANOMALY_TYPE_LABEL[a.type]}</span><span className="text-white/40 text-xs font-mono">{formatTime(a.timestamp)} – {formatTime(a.endTimestamp)}</span><span className="ml-auto text-xs text-white/35 font-mono">Confiança: {a.confidence}%</span></div><p className="text-white/50 text-xs mt-0.5">{a.description}</p></div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                    </button>
                    {isExp && (
                      <div className="px-4 pb-4 border-t border-white/10">
                        <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/[0.06]"><p className="text-white/30 text-[10px] font-mono uppercase mb-1.5">Análise técnica</p><p className="text-white/65 text-xs leading-relaxed font-mono">{a.technical}</p></div>
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[10px] text-white/30 font-mono"><span>Índice de confiança</span><span className={sc.text}>{a.confidence}%</span></div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${a.confidence}%` }} /></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center gap-2"><Mic className="w-4 h-4 text-violet-400" /><p className="text-white/40 text-xs font-mono uppercase">Conclusão pericial</p></div>
              <p className="text-white/70 text-sm leading-relaxed">Arquivo classificado como <span className="text-red-400 font-semibold">provavelmente editado</span>. Ruptura de integridade em 00:14.1 e 00:28.5. Recomenda-se análise laboratorial humana confirmatória. Achados compatíveis com edição em DAW e reexportação em taxa de bits inferior.</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ label: "Integridade", value: "Comprometida", color: "text-red-400" }, { label: "Recomendação", value: "Análise humana", color: "text-amber-400" }, { label: "Cadeia custódia", value: "Rompida", color: "text-red-400" }].map(c => (
                  <div key={c.label} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center"><p className={`font-semibold text-sm ${c.color}`}>{c.value}</p><p className="text-white/30 text-[10px] mt-0.5">{c.label}</p></div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/25 text-xs font-mono"><Clock className="w-3 h-3" /><span>Análise gerada em {new Date().toLocaleString("pt-BR")} — SIPAER AI LabData v1.0</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Stage = "upload" | "processing" | "analysis";

export default function AudioAnalysisPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [step, setStep] = useState(0);

  const rng = makeRng(42);
  const waveform = generateWaveform(44100, rng, ANOMALIES);
  const spectroData = generateAudioSpectro(800, 200, makeRng(99), ANOMALIES, FILE.duration);
  const mfccFrames = generateMFCC(120, makeRng(77), ANOMALIES, FILE.duration);

  const handleUpload = useCallback(() => {
    setStage("processing"); setStep(0);
    const delays = [400, 700, 900, 600, 800, 1000, 1200];
    let cum = 0;
    delays.forEach((d, i) => { cum += d; setTimeout(() => { setStep(i + 1); if (i === delays.length - 1) setTimeout(() => setStage("analysis"), 500); }, cum); });
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070f1c] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06]">
        <Link href="/labdata" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors"><ArrowLeft className="w-3.5 h-3.5" />LabData</Link>
        <span className="text-white/20">/</span>
        <span className="text-violet-400 text-xs font-medium">Análise Pericial de Áudio</span>
      </div>
      {stage === "upload" && <UploadZone onUpload={handleUpload} />}
      {stage === "processing" && <ProcessingView step={step} />}
      {stage === "analysis" && <AnalysisView waveform={waveform} spectroData={spectroData} mfccFrames={mfccFrames} anomalies={ANOMALIES} onReset={() => { setStage("upload"); setStep(0); }} />}
    </div>
  );
}
