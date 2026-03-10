"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3, Upload, CheckCircle2, Cpu, Activity, FileAudio, Sparkles,
  Clock, ChevronDown, ChevronUp, Download, RefreshCw, XCircle,
  ArrowLeft, Zap, AlertTriangle, Info, AudioLines, TrendingDown, Radio, Gauge,
} from "lucide-react";
import { makeRng, formatTime, SEV_COLORS, type AcousticEvent } from "@/components/labdata/shared";
import {
  EngineSpectrogramCanvas, RPMChart, BandPowerChart,
  generateEngineSpectro, generateRPMCurve, generateBandPower,
} from "@/components/labdata/SpectralCanvases";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const DURATION = 72;

const EVENTS: AcousticEvent[] = [
  { id: "e1", timestamp: 17.8, type: "motor_queda_rpm", severity: "critico", label: "Queda de RPM", description: "Queda abrupta de RPM — possível falha de ignição", freqPeak: 38.4, deltaRPM: -820, technical: "Frequência fundamental cai de 44.7 Hz (2680 RPM) para 30.8 Hz (1848 RPM) em 0.4 s. Padrão assimétrico nos harmônicos 2× e 3× indica falha em cilindros alternados. Compatível com interrupção de ignição ou obstrução de combustível." },
  { id: "e2", timestamp: 24.3, type: "vibracao_estrutural", severity: "alto", label: "Vibração estrutural anômala", description: "Ressonância incomum em componentes estruturais", freqPeak: 112, technical: "Energia elevada no espectro entre 105–120 Hz, faixa associada à ressonância da fuselagem. Amplitude 18 dB acima da linha de base. Possível dano estrutural ou desbalanceamento de hélice." },
  { id: "e3", timestamp: 31.1, type: "alarme_cabine", severity: "alto", label: "Alarme de cabine detectado", description: "Tom de alarme identificado — 3500 Hz", freqPeak: 3500, technical: "Tonal puro a 3500 Hz, duração 0.8 s, amplitude −12 dBFS. Padrão consistente com alarme GPWS ou stall warning. Correlação com FDR indica altitude < 150 ft AGL." },
  { id: "e4", timestamp: 38.7, type: "perda_potencia", severity: "critico", label: "Perda total de potência", description: "Ausência de harmônicos do motor a partir de 00:38.7", technical: "Desaparecimento de todos os harmônicos do motor (F0 e 2×–8×) a partir de 00:38.7. Apenas ruído aerodinâmico residual. Indica parada total do motor em < 200 ms." },
  { id: "e5", timestamp: 44.2, type: "impacto", severity: "critico", label: "Assinatura de impacto", description: "Burst de energia broadband — evento de impacto", technical: "Burst de banda larga (0–22 kHz), duração < 80 ms, pico −1.8 dBFS. Decaimento rápido e ausência de harmônicos indicam impacto físico, consistente com colisão com terreno." },
];

const STEPS = [
  { id: "d", label: "Decodificação do áudio", detail: "WAV PCM 24-bit / 44.1 kHz" },
  { id: "f", label: "FFT — Análise de potência espectral", detail: "N=8192, resolução 5.4 Hz" },
  { id: "s", label: "STFT — Espectrograma tempo-frequência", detail: "Janela 93 ms, hop 23 ms" },
  { id: "h", label: "Rastreamento de harmônicos do motor", detail: "F0 tracking (2–100 Hz)" },
  { id: "b", label: "Análise por bandas de frequência", detail: "Estrutural / Motor / Aerodinâmico" },
  { id: "e", label: "Detecção de eventos acústicos", detail: "Transientes, alarmes, impactos" },
  { id: "ai", label: "Correlação CVR × FDR + IA", detail: "Reconstrução da sequência" },
];

const CORRELATIONS = [
  { time: "00:17.8", cvr: "Ruído anômalo no motor — possível falha", fdr: "RPM: 2680→1848 / MP: 28→18 inHg" },
  { time: "00:24.3", cvr: "Vibração perceptível na cabine", fdr: "Vertical G: +2.4g / Flap: 0°" },
  { time: "00:31.1", cvr: "Alarme sonoro (GPWS)", fdr: "Alt: 148 ft AGL / VS: −820 fpm" },
  { time: "00:38.7", cvr: "Silêncio — motor parado", fdr: "RPM: 0 / OAT sensor: timeout" },
  { time: "00:44.2", cvr: "[fim de gravação]", fdr: "Aceleração vertical: −22g (impacto)" },
];

// ─── Upload ───────────────────────────────────────────────────────────────────

function UploadZone({ onUpload }: { onUpload: () => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
            <BarChart3 className="w-9 h-9 text-cyan-400" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Análise Espectral Aeronáutica</h2>
          <p className="text-white/50 mt-2">Identifica assinaturas de motor, vibrações estruturais, alarmes e permite reconstrução da sequência do acidente.</p>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onUpload(); }} onClick={onUpload}
          className={`rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all group ${drag ? "border-cyan-400/60 bg-cyan-500/10" : "border-white/15 hover:border-cyan-400/40 hover:bg-white/[0.02]"}`}>
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 transition-colors ${drag ? "text-cyan-400" : "text-white/30 group-hover:text-cyan-400"}`} />
            <p className="text-white/70 font-medium">Arraste o arquivo CVR ou gravação de motor</p>
            <p className="text-white/30 text-sm">WAV · MP3 · OGG — até 500 MB</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-left">
          {[{ icon: AudioLines, label: "Sons do motor / hélice", sub: "Harmônicos de propulsão" }, { icon: Activity, label: "Vibrações estruturais", sub: "Ressonâncias de fuselagem" }, { icon: Radio, label: "Cockpit Voice Recorder", sub: "CVR — correlação FDR" }, { icon: Zap, label: "Eventos acústicos", sub: "Impactos, alarmes, transientes" }].map((s) => {
            const I = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/15 flex items-center justify-center shrink-0"><I className="w-4 h-4 text-cyan-400" /></div>
                <div><p className="text-white/80 text-sm font-medium">{s.label}</p><p className="text-white/35 text-xs">{s.sub}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Processing ───────────────────────────────────────────────────────────────

function ProcessingView({ step }: { step: number }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center animate-pulse"><Cpu className="w-7 h-7 text-cyan-400" /></div>
          </div>
          <h3 className="text-xl font-bold text-white">Processando análise espectral...</h3>
          <p className="text-white/40 text-sm">{step < STEPS.length ? STEPS[step].label : "Finalizando"}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/40"><span>Progresso</span><span>{Math.round((step / STEPS.length) * 100)}%</span></div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} /></div>
        </div>
        <div className="space-y-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${i < step ? "bg-emerald-500/5 border border-emerald-500/20" : i === step ? "bg-cyan-500/10 border border-cyan-400/30" : "bg-white/[0.02] border border-white/[0.06] opacity-40"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i < step ? "bg-emerald-500/20" : i === step ? "bg-cyan-500/20 animate-pulse" : "bg-white/10"}`}>
                {i < step ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : i === step ? <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
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

function AnalysisView({ spectroData, rpmData, bandData, events, onReset }: {
  spectroData: Float32Array; rpmData: ReturnType<typeof generateRPMCurve>;
  bandData: ReturnType<typeof generateBandPower>; events: AcousticEvent[]; onReset: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>("e1");
  const criticos = events.filter(e => e.severity === "critico").length;
  const altos = events.filter(e => e.severity === "alto").length;

  const sequence = [
    { t: "00:00–00:17.8", text: "Operação normal. Motor em regime de cruzeiro (2680 RPM). Harmônicos estáveis.", color: "text-emerald-400" },
    { t: "00:17.8", text: "Queda abrupta de RPM (−820 RPM em 0.4 s). Padrão assimétrico indica falha parcial de ignição ou interrupção de combustível.", color: "text-amber-400" },
    { t: "00:24.3", text: "Ressonância estrutural em 112 Hz sugere vibração excessiva por desbalanceamento de hélice ou início de dano estrutural.", color: "text-orange-400" },
    { t: "00:31.1", text: "Tonal puro a 3500 Hz — alarme GPWS. Altitude < 150 ft AGL confirmada por FDR. Aeronave em trajetória descendente não controlada.", color: "text-red-400" },
    { t: "00:38.7", text: "Cessação completa dos harmônicos. Parada total do motor. Apenas ruído aerodinâmico residual.", color: "text-red-400" },
    { t: "00:44.2", text: "Burst broadband de alta energia — impacto com terreno. Fim da gravação. Aceleração −22g confirmada pelo FDR.", color: "text-red-500" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="sticky top-0 z-10 bg-[#0d1b2e]/95 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center gap-3 flex-wrap">
        <FileAudio className="w-4 h-4 text-cyan-400" />
        <span className="text-white font-mono text-sm">CVR_OC2024_0312_ENGINE.wav</span>
        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/25 text-cyan-300 text-xs font-mono">CVR</span>
        {["WAV PCM", "44.1 kHz", "24-bit", "Mono", "00:72.0"].map((v, i) => <span key={i} className="text-xs text-white/40 font-mono">{v}</span>)}
        <div className="ml-auto flex items-center gap-2">
          {criticos > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs"><AlertTriangle className="w-3 h-3" />{criticos} crítico</span>}
          {altos > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs"><Info className="w-3 h-3" />{altos} alto</span>}
          <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs transition-all"><XCircle className="w-3.5 h-3.5" />Novo arquivo</button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Spectrogram */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-400" /><span className="text-white text-sm font-medium">Espectrograma de Motor — STFT</span><span className="text-white/30 text-xs font-mono">harmônicos F0 em amarelo</span></div>
            <div className="flex items-center gap-3 text-xs font-mono text-white/30"><span>N=8192</span><span>Hop=256</span><span>Hann</span></div>
          </div>
          <div className="p-3 space-y-1">
            <EngineSpectrogramCanvas data={spectroData} cols={900} rows={220} events={events} duration={DURATION} />
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/25 text-[10px]">−∞ dB</span>
              <div className="flex-1 h-2 rounded" style={{ background: "linear-gradient(to right,#440154,#482878,#3e4989,#31688e,#35b779,#6dcd59,#b4de2c,#fde725)" }} />
              <span className="text-white/25 text-[10px]">0 dB</span>
            </div>
          </div>
        </div>

        {/* RPM */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-cyan-400" /><span className="text-white text-sm font-medium">RPM Estimado — Rastreamento por Harmônicos</span></div>
            <div className="flex gap-3 text-xs font-mono"><span className="text-cyan-400">Base: 2680 RPM</span><span className="text-red-400">Mín: 0 RPM</span></div>
          </div>
          <div className="p-3"><RPMChart data={rpmData} duration={DURATION} events={events} /></div>
        </div>

        {/* Band Power */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" /><span className="text-white text-sm font-medium">Potência por Banda de Frequência</span></div>
            <div className="flex gap-4 text-xs font-mono"><span className="text-indigo-400">— Estrutural</span><span className="text-cyan-400">— Motor</span><span className="text-orange-400">— Aerodinâmico</span></div>
          </div>
          <div className="p-3"><BandPowerChart data={bandData} duration={DURATION} /></div>
        </div>

        {/* Events + Correlation */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10"><Zap className="w-4 h-4 text-amber-400" /><span className="text-white text-sm font-medium">Eventos Acústicos Detectados</span></div>
            <div className="p-4 space-y-3">
              {events.map(ev => {
                const sc = SEV_COLORS[ev.severity];
                const isExp = expanded === ev.id;
                return (
                  <div key={ev.id} className={`rounded-xl border ${sc.bg} ${sc.border} overflow-hidden`}>
                    <button className="w-full flex items-center gap-3 p-3.5 text-left" onClick={() => setExpanded(isExp ? null : ev.id)}>
                      <div className={`w-2 h-2 rounded-full ${sc.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-semibold ${sc.text}`}>{ev.label}</span><span className="text-white/35 text-xs font-mono">{formatTime(ev.timestamp)}</span>
                          {ev.deltaRPM && <span className="ml-auto flex items-center gap-0.5 text-red-400 text-xs font-mono"><TrendingDown className="w-3 h-3" />{ev.deltaRPM} RPM</span>}
                          {ev.freqPeak && !ev.deltaRPM && <span className="ml-auto text-white/30 text-xs font-mono">{ev.freqPeak >= 1000 ? (ev.freqPeak / 1000).toFixed(1) + " kHz" : ev.freqPeak + " Hz"}</span>}
                        </div>
                        <p className="text-white/45 text-xs mt-0.5">{ev.description}</p>
                      </div>
                      {isExp ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />}
                    </button>
                    {isExp && (
                      <div className="px-4 pb-4 border-t border-white/10">
                        <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/[0.06]"><p className="text-white/30 text-[10px] font-mono uppercase mb-1.5">Análise técnica espectral</p><p className="text-white/65 text-xs leading-relaxed font-mono">{ev.technical}</p></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10"><Radio className="w-4 h-4 text-emerald-400" /><span className="text-white text-sm font-medium">Correlação CVR × FDR</span></div>
            <div className="p-4 space-y-2">
              {CORRELATIONS.map((c, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                  <div className="text-white/30 text-xs font-mono w-14 shrink-0 pt-0.5">{c.time}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-white/70 text-xs"><span className="text-cyan-400 font-medium">CVR </span>{c.cvr}</p>
                    <p className="text-white/50 text-xs"><span className="text-emerald-400 font-medium">FDR </span>{c.fdr}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI */}
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-cyan-400/15">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-cyan-400" /></div>
              <div><p className="text-white font-semibold text-sm">Interpretação Espectral por IA</p><p className="text-white/35 text-xs font-mono">Modelo CENIPA — Análise acústica aeronáutica v2.1</p></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">Confiança: 91%</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/20 text-cyan-300 text-xs transition-all"><Download className="w-3.5 h-3.5" />Exportar laudo</button>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <p className="text-white/40 text-xs font-mono uppercase tracking-wider">Sequência reconstituída</p>
              <div className="space-y-2">
                {sequence.map(s => (
                  <div key={s.t} className="flex gap-3">
                    <span className="text-white/30 text-xs font-mono w-24 shrink-0 pt-0.5">{s.t}</span>
                    <p className={`text-xs leading-relaxed ${s.color}`}>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <p className="text-white/40 text-xs font-mono uppercase tracking-wider">Conclusão</p>
              <p className="text-white/70 text-sm leading-relaxed">A análise espectral indica <span className="text-red-400 font-semibold">falha de motor como evento iniciador</span>, seguida de perda de controle e colisão com o terreno. A correlação com FDR confirma a reconstrução. Fator dominante: <span className="text-amber-400 font-medium">Falha de sistema propulsivo (SCF-PP)</span>.</p>
              <div className="grid grid-cols-3 gap-2">
                {[{ label: "Evento iniciador", value: "Falha de motor", color: "text-red-400" }, { label: "Fator SIPAER", value: "SCF-PP", color: "text-amber-400" }, { label: "Confiança", value: "91%", color: "text-emerald-400" }].map(c => (
                  <div key={c.label} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center"><p className={`font-semibold text-sm ${c.color}`}>{c.value}</p><p className="text-white/30 text-[10px] mt-0.5">{c.label}</p></div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/25 text-xs font-mono"><Clock className="w-3 h-3" /><span>Análise gerada em {new Date().toLocaleString("pt-BR")} — SIPAER AI LabData Espectral v1.0</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Stage = "upload" | "processing" | "analysis";

export default function SpectralAnalysisPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [step, setStep] = useState(0);

  const spectroData = generateEngineSpectro(900, 220, makeRng(13), EVENTS, DURATION);
  const rpmData = generateRPMCurve(300, DURATION);
  const bandData = generateBandPower(300, DURATION, makeRng(55));

  const handleUpload = useCallback(() => {
    setStage("processing"); setStep(0);
    const delays = [500, 800, 1000, 700, 600, 900, 1100];
    let cum = 0;
    delays.forEach((d, i) => { cum += d; setTimeout(() => { setStep(i + 1); if (i === delays.length - 1) setTimeout(() => setStage("analysis"), 500); }, cum); });
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070f1c] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06]">
        <Link href="/labdata" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors"><ArrowLeft className="w-3.5 h-3.5" />LabData</Link>
        <span className="text-white/20">/</span>
        <span className="text-cyan-400 text-xs font-medium">Análise Espectral Aeronáutica</span>
      </div>
      {stage === "upload" && <UploadZone onUpload={handleUpload} />}
      {stage === "processing" && <ProcessingView step={step} />}
      {stage === "analysis" && <AnalysisView spectroData={spectroData} rpmData={rpmData} bandData={bandData} events={EVENTS} onReset={() => { setStage("upload"); setStep(0); }} />}
    </div>
  );
}
