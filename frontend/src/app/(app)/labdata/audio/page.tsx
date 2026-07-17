"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Upload, Play, Pause, Square, AlertTriangle, CheckCircle2, Cpu,
  FileAudio, Sparkles, Clock, ChevronDown, ChevronUp, RefreshCw, XCircle,
  Mic, Users, ListChecks, BookOpen, Activity, Languages, ArrowLeft, Gauge,
} from "lucide-react";
import { formatTime, formatBytes } from "@/components/labdata/shared";
import {
  transcription,
  type TranscriptionResult,
  type SpeakerRole,
  type StressLevel,
  type TranscriptTurn,
} from "@/lib/api";

// ─── Estilos por papel / stress ───────────────────────────────────────────────

const ROLE_STYLE: Record<SpeakerRole, { text: string; bg: string; border: string; dot: string }> = {
  Piloto:        { text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-400/30", dot: "bg-violet-400" },
  Copiloto:      { text: "text-indigo-300", bg: "bg-indigo-500/10", border: "border-indigo-400/30", dot: "bg-indigo-400" },
  Controlador:   { text: "text-cyan-300",   bg: "bg-cyan-500/10",   border: "border-cyan-400/30",   dot: "bg-cyan-400" },
  Mecânico:      { text: "text-amber-300",  bg: "bg-amber-500/10",  border: "border-amber-400/30",  dot: "bg-amber-400" },
  Testemunha:    { text: "text-emerald-300",bg: "bg-emerald-500/10",border: "border-emerald-400/30",dot: "bg-emerald-400" },
  Investigador:  { text: "text-sky-300",    bg: "bg-sky-500/10",    border: "border-sky-400/30",    dot: "bg-sky-400" },
  Indeterminado: { text: "text-muted-foreground", bg: "bg-muted/30", border: "border-border", dot: "bg-muted-foreground/50" },
};

const roleStyle = (r: SpeakerRole) => ROLE_STYLE[r] ?? ROLE_STYLE.Indeterminado;

const STRESS_STYLE: Record<StressLevel, { text: string; bg: string; label: string }> = {
  alto:  { text: "text-red-400",     bg: "bg-red-500/15",     label: "Alto" },
  medio: { text: "text-amber-400",   bg: "bg-amber-500/15",   label: "Médio" },
  baixo: { text: "text-emerald-400", bg: "bg-emerald-500/15", label: "Baixo" },
};

const stressStyle = (l: StressLevel) => STRESS_STYLE[l] ?? STRESS_STYLE.baixo;

const ACCEPT = "audio/*,.wav,.mp3,.ogg,.m4a,.flac,.webm";

// ─── Upload ────────────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
            <Mic className="w-9 h-9 text-violet-400" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transcrição &amp; Análise de Áudio</h2>
          <p className="text-muted-foreground mt-2">Transcrição por IA (Whisper) com inferência de falantes, papéis e fatos-chave.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all group ${drag ? "border-violet-400/60 bg-violet-500/10" : "border-border hover:border-violet-400/40 hover:bg-muted/20"}`}
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 transition-colors ${drag ? "text-violet-400" : "text-muted-foreground group-hover:text-violet-400"}`} />
            <p className="text-foreground/70 font-medium">Arraste o arquivo ou clique para selecionar</p>
            <p className="text-muted-foreground/60 text-sm">WAV · MP3 · OGG · M4A · FLAC — até 300 MB</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { icon: Users, label: "Falantes &amp; papéis", sub: "Piloto, Controlador, Mecânico…" },
            { icon: Clock, label: "Timeline", sub: "Trechos com timestamps" },
            { icon: ListChecks, label: "Fatos-chave", sub: "Extração de eventos" },
            { icon: BookOpen, label: "Terminologia", sub: "Fraseologia aeronáutica" },
          ].map((s) => {
            const I = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/70">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-400/15 flex items-center justify-center shrink-0"><I className="w-4 h-4 text-violet-400" /></div>
                <div><p className="text-foreground/80 text-sm font-medium" dangerouslySetInnerHTML={{ __html: s.label }} /><p className="text-muted-foreground/70 text-xs">{s.sub}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Processing ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Enviando áudio", detail: "Upload para o backend" },
  { label: "Transcrevendo (Whisper)", detail: "whisper-large-v3 · verbose_json" },
  { label: "Analisando diálogo (IA)", detail: "gpt-oss-120b · papéis e fatos" },
];

function ProcessingView({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    // Avança e segura no último passo (a duração real depende da resposta do backend).
    const t1 = setTimeout(() => setStep(1), 1200);
    const t2 = setTimeout(() => setStep(2), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center animate-pulse">
              <Cpu className="w-7 h-7 text-violet-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground">Processando áudio…</h3>
          <p className="text-muted-foreground text-sm font-mono truncate">{fileName}</p>
        </div>
        <div className="space-y-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${i < step ? "bg-emerald-500/5 border border-emerald-500/20" : i === step ? "bg-violet-500/10 border border-violet-400/30" : "bg-muted/20 border border-border/70 opacity-40"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i < step ? "bg-emerald-500/20" : i === step ? "bg-violet-500/20" : "bg-muted"}`}>
                {i < step ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : i === step ? <RefreshCw className="w-3 h-3 text-violet-400 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />}
              </div>
              <div><p className={`text-sm font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p><p className="text-xs text-muted-foreground/60 font-mono">{s.detail}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Error ─────────────────────────────────────────────────────────────────────

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Falha na transcrição</h3>
          <p className="text-muted-foreground text-sm mt-1">{message}</p>
        </div>
        <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 text-violet-300 text-sm transition-all">
          <RefreshCw className="w-4 h-4" />Tentar outro arquivo
        </button>
      </div>
    </div>
  );
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function AnalysisView({ result, file, audioUrl, onReset }: {
  result: TranscriptionResult; file: File; audioUrl: string; onReset: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { analysis, text, language, duration } = result;
  const turns = analysis.turns;

  const activeIdx = turns.findIndex((t) => current >= t.start && current < t.end);

  const seek = (t: number) => {
    if (audioRef.current) { audioRef.current.currentTime = t; setCurrent(t); }
  };
  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  const stop = () => {
    const a = audioRef.current; if (!a) return;
    a.pause(); a.currentTime = 0; setPlaying(false); setCurrent(0);
  };

  const stressFor = (turn: TranscriptTurn) =>
    analysis.stress.find((s) => s.start === turn.start && s.end === turn.end);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      {/* Info bar */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-6 py-3 flex items-center gap-3 flex-wrap">
        <FileAudio className="w-4 h-4 text-violet-400" />
        <span className="text-foreground font-mono text-sm truncate max-w-[280px]">{file.name}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono"><Languages className="w-3 h-3" />{(language || "pt").toUpperCase()}</span>
        <span className="text-xs text-muted-foreground font-mono">{formatTime(duration)}</span>
        <span className="text-xs text-muted-foreground font-mono">{formatBytes(file.size)}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono"><Users className="w-3 h-3" />{analysis.speakers.length} falante{analysis.speakers.length === 1 ? "" : "s"}</span>
        <div className="ml-auto">
          <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-xs transition-all"><XCircle className="w-3.5 h-3.5" />Novo arquivo</button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Player */}
        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={stop} className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted border border-border flex items-center justify-center transition-all"><Square className="w-3.5 h-3.5 text-muted-foreground" /></button>
            <button onClick={toggle} className="w-9 h-9 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 flex items-center justify-center transition-all">{playing ? <Pause className="w-4 h-4 text-violet-400" /> : <Play className="w-4 h-4 text-violet-400" />}</button>
            <span className="text-muted-foreground text-xs font-mono w-14">{formatTime(current)}</span>
            <div
              className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * duration); }}
            >
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 to-violet-400 rounded-full" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} />
              {/* marcadores dos trechos */}
              {turns.map((t, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-px bg-foreground/20" style={{ left: `${duration ? (t.start / duration) * 100 : 0}%` }} />
              ))}
            </div>
            <span className="text-muted-foreground/60 text-xs font-mono w-14 text-right">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Resumo */}
        {!!analysis.summary && (
          <div className="rounded-xl border border-violet-400/20 bg-violet-500/[0.03] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-violet-400/15">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-violet-400" /></div>
              <div><p className="text-foreground font-semibold text-sm">Resumo do diálogo</p><p className="text-muted-foreground/70 text-xs font-mono">Interpretação por IA · gpt-oss-120b</p></div>
            </div>
            <div className="p-5"><p className="text-foreground/80 text-sm leading-relaxed">{analysis.summary}</p></div>
          </div>
        )}

        {/* Falantes */}
        {analysis.speakers.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border"><Users className="w-4 h-4 text-violet-400" /><span className="text-foreground text-sm font-medium">Falantes &amp; papéis inferidos</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-muted/50">
              {analysis.speakers.map((sp) => {
                const st = roleStyle(sp.role);
                return (
                  <div key={sp.id} className="p-4 bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                      <span className={`text-sm font-semibold ${st.text}`}>{sp.role}</span>
                      <span className="text-muted-foreground/60 text-xs font-mono">{sp.id}</span>
                      <span className="ml-auto text-xs text-muted-foreground/70 font-mono">{sp.confidence}%</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full ${st.dot}`} style={{ width: `${sp.confidence}%` }} /></div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{sp.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transcrição / timeline */}
        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border"><Clock className="w-4 h-4 text-violet-400" /><span className="text-foreground text-sm font-medium">Transcrição — linha do tempo</span><span className="text-muted-foreground/60 text-xs font-mono">{turns.length} trechos</span></div>
          <div className="divide-y divide-border/60">
            {turns.length === 0 && (
              <div className="p-6 text-center text-muted-foreground text-sm">{text || "Nenhuma fala detectada no áudio."}</div>
            )}
            {turns.map((t, i) => {
              const st = roleStyle(t.role);
              const active = i === activeIdx;
              const stress = stressFor(t);
              return (
                <button
                  key={i}
                  onClick={() => seek(t.start)}
                  className={`w-full text-left flex gap-3 p-4 transition-colors ${active ? "bg-violet-500/10" : "hover:bg-muted/30"}`}
                >
                  <span className={`w-1 rounded-full shrink-0 ${active ? st.dot : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${st.bg} ${st.border} border ${st.text}`}>{t.role}</span>
                      <span className="text-muted-foreground/60 text-xs font-mono">{t.speaker}</span>
                      <span className="text-muted-foreground/50 text-xs font-mono">{formatTime(t.start)} – {formatTime(t.end)}</span>
                      {stress && <span className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${stressStyle(stress.level).bg} ${stressStyle(stress.level).text}`}><Gauge className="w-3 h-3" />Stress {stressStyle(stress.level).label}</span>}
                    </div>
                    <p className={`text-sm leading-relaxed ${active ? "text-foreground" : "text-foreground/75"}`}>{t.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fatos-chave + Terminologia */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {analysis.keyFacts.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border"><ListChecks className="w-4 h-4 text-emerald-400" /><span className="text-foreground text-sm font-medium">Fatos-chave</span></div>
              <div className="p-4 space-y-3">
                {analysis.keyFacts.map((k, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="shrink-0 px-2 py-0.5 h-fit rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">{k.time}</span>
                    <p className="text-foreground/75 text-sm leading-relaxed">{k.fact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.terminology.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border"><BookOpen className="w-4 h-4 text-amber-400" /><span className="text-foreground text-sm font-medium">Terminologia aeronáutica</span></div>
              <div className="p-4 space-y-3">
                {analysis.terminology.map((tm, i) => (
                  <div key={i}>
                    <p className="text-amber-300/90 text-sm font-medium">{tm.term}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">{tm.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stress markers (visão consolidada) */}
        {analysis.stress.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border"><Activity className="w-4 h-4 text-red-400" /><span className="text-foreground text-sm font-medium">Indicadores de stress / urgência</span><span className="text-muted-foreground/50 text-xs">(inferidos do texto)</span></div>
            <div className="divide-y divide-border/60">
              {analysis.stress.map((s, i) => {
                const isExp = expanded === `st${i}`;
                const ss = stressStyle(s.level);
                return (
                  <div key={i}>
                    <button onClick={() => setExpanded(isExp ? null : `st${i}`)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${ss.bg} ${ss.text}`}>{ss.label}</span>
                      <span className="text-muted-foreground/60 text-xs font-mono">{formatTime(s.start)} – {formatTime(s.end)}</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground/60 ml-auto" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/60 ml-auto" />}
                    </button>
                    {isExp && <div className="px-4 pb-3"><p className="text-foreground/65 text-xs leading-relaxed">{s.reason}</p></div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground/50 text-xs font-mono">
          <Clock className="w-3 h-3" /><span>Transcrição Whisper + análise IA — gerada em {new Date().toLocaleString("pt-BR")} · SIPAER AI LabData</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Stage = "upload" | "processing" | "analysis" | "error";

export default function AudioAnalysisPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string>("");

  // Revoga o object URL ao trocar/desmontar.
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const reset = useCallback(() => {
    setStage("upload"); setFile(null); setResult(null); setError("");
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
  }, []);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); });
    setStage("processing");
    transcription
      .analyze(f)
      .then((res) => { setResult(res); setStage("analysis"); })
      .catch((e) => { setError(e?.message ?? "Erro inesperado"); setStage("error"); });
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <Link href="/labdata" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground/70 text-xs transition-colors"><ArrowLeft className="w-3.5 h-3.5" />LabData</Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-violet-400 text-xs font-medium">Transcrição &amp; Análise de Áudio</span>
      </div>
      {stage === "upload" && <UploadZone onFile={handleFile} />}
      {stage === "processing" && <ProcessingView fileName={file?.name ?? ""} />}
      {stage === "error" && <ErrorView message={error} onRetry={reset} />}
      {stage === "analysis" && result && file && (
        <AnalysisView result={result} file={file} audioUrl={audioUrl} onReset={reset} />
      )}
    </div>
  );
}
