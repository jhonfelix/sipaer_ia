"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Building2, Send, Sparkles, FileText, ClipboardList, Scale,
  CheckCircle2, Clock, ChevronRight, Download, Copy, RefreshCw,
  BookOpen, AlertCircle, Search, Plus, X, Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  loading?: boolean;
  docOutput?: DocOutput;
}

interface DocOutput {
  title: string;
  sections: { heading: string; content: string }[];
  references: string[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
  category: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  { id: "q1", label: "Elaborar Edital de Licitação", icon: ClipboardList, category: "Licitação", prompt: "Elabore um modelo de edital de licitação na modalidade Pregão Eletrônico para contratação de serviços de TI, conforme a Lei 14.133/2021." },
  { id: "q2", label: "Termo de Referência", icon: FileText, category: "Licitação", prompt: "Crie um Termo de Referência para aquisição de equipamentos de informática, incluindo especificações técnicas, critérios de habilitação e condições de entrega." },
  { id: "q3", label: "Minuta de Contrato", icon: Scale, category: "Contratos", prompt: "Gere uma minuta de contrato administrativo para prestação de serviços continuados, com cláusulas de vigência, reajuste, penalidades e rescisão conforme legislação vigente." },
  { id: "q4", label: "DFD – Documento de Formalização", icon: ClipboardList, category: "Licitação", prompt: "Elabore um DFD (Documento de Formalização de Demanda) para contratação de serviço de limpeza e conservação, conforme IN SEGES 58/2022." },
  { id: "q5", label: "Pesquisa de Preços", icon: Search, category: "Licitação", prompt: "Oriente como realizar pesquisa de preços para subsidiar contratação pública, conforme a IN SEGES 65/2021, indicando fontes e metodologia de cálculo do valor estimado." },
  { id: "q6", label: "Verificar Conformidade", icon: CheckCircle2, category: "Conformidade", prompt: "Verifique os principais pontos de conformidade legal que um processo licitatório deve atender conforme a Nova Lei de Licitações (Lei 14.133/2021)." },
  { id: "q7", label: "Análise Jurídica", icon: Scale, category: "Conformidade", prompt: "Realize uma análise dos principais riscos jurídicos em contratos administrativos e como mitigá-los." },
  { id: "q8", label: "Portaria Interna", icon: FileText, category: "Documentos", prompt: "Elabore um modelo de portaria interna para designação de comissão de licitação, com os requisitos legais necessários." },
];

const LEGAL_REFS = [
  { label: "Lei 14.133/2021", sub: "Nova Lei de Licitações e Contratos" },
  { label: "Lei 8.666/93", sub: "Lei de Licitações (vigência parcial)" },
  { label: "IN SEGES 58/2022", sub: "Serviços Continuados" },
  { label: "IN SEGES 65/2021", sub: "Pesquisa de Preços" },
  { label: "Decreto 10.024/2019", sub: "Pregão Eletrônico" },
  { label: "Lei 10.520/2002", sub: "Modalidade Pregão" },
];

// ─── Mock AI Responses ────────────────────────────────────────────────────────

function generateResponse(prompt: string): { content: string; docOutput?: DocOutput } {
  const lower = prompt.toLowerCase();

  if (lower.includes("edital") || lower.includes("pregão")) {
    return {
      content: "Elaborei um modelo de **Edital de Pregão Eletrônico** conforme a Lei 14.133/2021. O documento inclui as seções obrigatórias: objeto, habilitação, proposta, critérios de julgamento e penalidades.",
      docOutput: {
        title: "EDITAL DE PREGÃO ELETRÔNICO Nº __/2025",
        sections: [
          { heading: "1. DO OBJETO", content: "Contratação de empresa especializada na prestação de serviços de Tecnologia da Informação, incluindo suporte técnico, manutenção de infraestrutura e gestão de ativos, conforme especificações e condições estabelecidas neste Edital e seus Anexos." },
          { heading: "2. DA HABILITAÇÃO", content: "2.1 Habilitação Jurídica: Ato constitutivo, estatuto ou contrato social em vigor.\n2.2 Regularidade Fiscal: CND Federal, Estadual e Municipal; FGTS; Trabalhista.\n2.3 Qualificação Técnica: Atestado de capacidade técnica compatível com o objeto." },
          { heading: "3. DO CRITÉRIO DE JULGAMENTO", content: "Menor Preço Global, observados os requisitos mínimos de qualificação técnica estabelecidos no Termo de Referência (Anexo I)." },
          { heading: "4. DAS PENALIDADES", content: "O descumprimento total ou parcial das obrigações assumidas sujeitará o contratado às sanções previstas nos arts. 155 a 163 da Lei 14.133/2021, sem prejuízo das demais cominações legais." },
        ],
        references: ["Lei 14.133/2021, arts. 36, 67-70", "Decreto 10.024/2019", "IN SEGES 73/2022"],
      },
    };
  }

  if (lower.includes("termo de referência") || lower.includes("tr ")) {
    return {
      content: "Gerei um **Termo de Referência** para aquisição de equipamentos de informática. O documento contempla especificações técnicas mínimas, critérios de aceitação e obrigações das partes.",
      docOutput: {
        title: "TERMO DE REFERÊNCIA — AQUISIÇÃO DE EQUIPAMENTOS DE INFORMÁTICA",
        sections: [
          { heading: "1. JUSTIFICATIVA", content: "A presente contratação visa suprir a necessidade de modernização do parque tecnológico da Unidade, garantindo condições adequadas de trabalho e segurança da informação, em conformidade com o Plano de Contratações Anual." },
          { heading: "2. ESPECIFICAÇÕES TÉCNICAS", content: "Microcomputador: Processador Intel Core i7 (12ª geração ou superior), 16 GB RAM DDR4, SSD NVMe 512 GB, Monitor 24\" Full HD IPS, Sistema Operacional Windows 11 Pro (licença OEM)." },
          { heading: "3. CRITÉRIOS DE HABILITAÇÃO", content: "Atestado de capacidade técnica fornecido por pessoa jurídica de direito público ou privado, comprovando o fornecimento de equipamentos de informática em quantidade igual ou superior a 30% do quantitativo licitado." },
          { heading: "4. GARANTIA E SUPORTE", content: "Garantia mínima de 36 (trinta e seis) meses on-site, com tempo de resposta de até 8 horas úteis para chamados de severidade crítica." },
        ],
        references: ["Lei 14.133/2021, art. 6º, XXIII", "IN SGD/ME 1/2019", "Acórdão TCU 2094/2013-P"],
      },
    };
  }

  if (lower.includes("contrato") || lower.includes("minuta")) {
    return {
      content: "Elaborei uma **minuta de contrato administrativo** para prestação de serviços continuados, com as cláusulas essenciais exigidas pela Lei 14.133/2021.",
      docOutput: {
        title: "CONTRATO Nº __/2025 — PRESTAÇÃO DE SERVIÇOS CONTINUADOS",
        sections: [
          { heading: "CLÁUSULA PRIMEIRA — DO OBJETO", content: "O presente instrumento tem por objeto a prestação de serviços de _________, nas condições estabelecidas no Termo de Referência (Anexo I), que integra este Contrato independentemente de transcrição." },
          { heading: "CLÁUSULA SEGUNDA — DA VIGÊNCIA", content: "O prazo de vigência deste Contrato é de 12 (doze) meses, contados a partir de sua assinatura, podendo ser prorrogado, por interesse das partes, até o limite de 60 (sessenta) meses, conforme art. 106 da Lei 14.133/2021." },
          { heading: "CLÁUSULA TERCEIRA — DO REAJUSTE", content: "Os preços contratados poderão ser reajustados, após 12 (doze) meses da data-base da proposta, mediante aplicação do índice IPCA, observado o disposto no art. 92 da Lei 14.133/2021." },
          { heading: "CLÁUSULA QUARTA — DAS PENALIDADES", content: "O descumprimento das obrigações pactuadas ensejará a aplicação das penalidades previstas nos arts. 155 a 163 da Lei 14.133/2021: advertência, multa de até 30%, impedimento de licitar por até 3 anos, declaração de inidoneidade." },
        ],
        references: ["Lei 14.133/2021, arts. 89-108", "IN SEGES 58/2022", "TCU — Orientações para Contratos Administrativos"],
      },
    };
  }

  if (lower.includes("conformidade") || lower.includes("risco")) {
    return {
      content: "Realizei uma análise dos **principais pontos de conformidade** que todo processo licitatório deve observar sob a ótica da Lei 14.133/2021 e da jurisprudência do TCU.",
      docOutput: {
        title: "CHECKLIST DE CONFORMIDADE — PROCESSO LICITATÓRIO",
        sections: [
          { heading: "FASE PREPARATÓRIA", content: "☑ Estudo técnico preliminar (ETP)\n☑ Gerenciamento de riscos\n☑ Termo de Referência / Projeto Básico\n☑ DFD aprovado pela autoridade competente\n☑ Pesquisa de preços conforme IN 65/2021\n☑ Dotação orçamentária" },
          { heading: "FASE EXTERNA", content: "☑ Publicação no PNCP (obrigatória)\n☑ Prazo mínimo de divulgação respeitado\n☑ Critérios de habilitação proporcionais ao objeto\n☑ Modo de disputa definido (aberto/fechado/combinado)" },
          { heading: "RISCOS MAIS FREQUENTES (TCU)", content: "⚠ Especificações técnicas restritivas ou direcionadas\n⚠ Pesquisa de preços insuficiente ou desatualizada\n⚠ Habilitação excessiva incompatível com o objeto\n⚠ Ausência de gerenciamento de riscos" },
        ],
        references: ["Lei 14.133/2021", "Acórdão TCU 1102/2023-P", "Acórdão TCU 2814/2022-P"],
      },
    };
  }

  if (lower.includes("pesquisa de preço")) {
    return {
      content: "Orientei o procedimento de **pesquisa de preços** conforme a IN SEGES 65/2021, com fontes prioritárias e metodologia de cálculo do valor estimado.",
      docOutput: {
        title: "ORIENTAÇÃO — PESQUISA DE PREÇOS (IN SEGES 65/2021)",
        sections: [
          { heading: "FONTES PRIORITÁRIAS (ordem de preferência)", content: "1º Painel de Preços (paineldeprecos.economia.gov.br)\n2º Contratações similares de outros órgãos públicos (PNCP)\n3º Pesquisa publicada por entidade de referência setorial\n4º Pesquisa direta com fornecedores (mínimo 3 propostas)" },
          { heading: "METODOLOGIA DE CÁLCULO", content: "Calcular a média, mediana ou menor preço válido, excluindo valores inexequíveis (< 50% da média) ou sobrepreços (> 30% acima da média). Registrar justificativa da metodologia adotada." },
          { heading: "DOCUMENTAÇÃO OBRIGATÓRIA", content: "Mapa comparativo de preços assinado pelo responsável, prints ou comprovantes das fontes consultadas, data da pesquisa (não superior a 180 dias), CNPJ dos fornecedores consultados." },
        ],
        references: ["IN SEGES 65/2021", "Lei 14.133/2021, art. 23", "Acórdão TCU 2645/2022"],
      },
    };
  }

  // Generic response
  return {
    content: `Entendido. Com base nas normas da administração pública federal — especialmente a **Lei 14.133/2021** e instruções normativas do SEGES — posso auxiliar na elaboração de:\n\n- **Editais** de licitação (Pregão, Concorrência, Dispensa)\n- **Termos de Referência** e Projetos Básicos\n- **Minutas de contrato** e aditivos\n- **Análise de conformidade** e riscos jurídicos\n- **Documentos internos** (portarias, despachos, memorandos)\n\nQual documento você precisa elaborar ou qual dúvida posso esclarecer?`,
  };
}

// ─── Doc Output Panel ─────────────────────────────────────────────────────────

function DocPanel({ doc }: { doc: DocOutput }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = [doc.title, ...doc.sections.map(s => `${s.heading}\n${s.content}`), `\nReferências: ${doc.references.join(", ")}`].join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="text-foreground text-sm font-medium">Documento Gerado</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-border text-muted-foreground hover:text-foreground text-xs transition-all">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 text-amber-400 text-xs transition-all">
            <Download className="w-3.5 h-3.5" />Exportar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {/* Title */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-400/20">
          <p className="text-amber-300 font-bold text-sm text-center leading-snug">{doc.title}</p>
        </div>

        {/* Sections */}
        {doc.sections.map((s, i) => (
          <div key={i} className="space-y-2">
            <p className="text-foreground font-semibold text-xs uppercase tracking-wide">{s.heading}</p>
            <p className="text-foreground/65 text-xs leading-relaxed whitespace-pre-line">{s.content}</p>
          </div>
        ))}

        {/* References */}
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-muted-foreground/60 text-[10px] font-mono uppercase tracking-wider">Fundamentos legais</p>
          <div className="flex flex-wrap gap-1.5">
            {doc.references.map(r => (
              <span key={r} className="px-2 py-0.5 rounded-full bg-muted/40 border border-border text-muted-foreground text-[10px] font-mono">{r}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-amber-500/15 border border-amber-400/20 text-foreground/80 text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
        {msg.loading ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        {msg.loading ? (
          <div className="flex items-center gap-2 h-8">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
            <span className="text-muted-foreground/60 text-xs">Elaborando documento...</span>
          </div>
        ) : (
          <div className="text-foreground/75 text-sm leading-relaxed prose-sm">
            {msg.content.split("\n").map((line, i) => {
              if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-foreground">{line.slice(2, -2)}</p>;
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return <p key={i} className={line === "" ? "h-2" : ""}>{parts.map((p, j) => p.startsWith("**") ? <strong key={j} className="text-foreground font-semibold">{p.slice(2, -2)}</strong> : p)}</p>;
            })}
          </div>
        )}
        {!msg.loading && <p className="text-muted-foreground/40 text-[10px] font-mono">{msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Olá! Sou o assistente administrativo da **SIPAER AI**. Posso ajudá-lo na elaboração de processos licitatórios, minutas de contrato, termos de referência e outros documentos administrativos, com base nas normas vigentes — especialmente a **Lei 14.133/2021**.\n\nSelecione uma ação rápida ou descreva o documento que precisa elaborar.",
  timestamp: new Date(),
};

export default function DAPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [activeDoc, setActiveDoc] = useState<DocOutput | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    const loadingMsg: Message = { id: `l-${Date.now()}`, role: "assistant", content: "", timestamp: new Date(), loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");

    setTimeout(() => {
      const { content, docOutput } = generateResponse(text);
      const reply: Message = { id: `a-${Date.now()}`, role: "assistant", content, timestamp: new Date(), docOutput };
      setMessages(prev => prev.filter(m => !m.loading).concat(reply));
      if (docOutput) setActiveDoc(docOutput);
    }, 1800);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  const categories = ["Todos", ...Array.from(new Set(QUICK_ACTIONS.map(a => a.category)))];
  const filtered = QUICK_ACTIONS.filter(a =>
    (activeCategory === "Todos" || a.category === activeCategory) &&
    (search === "" || a.label.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-background">

      {/* ── Left Sidebar ── */}
      <div className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/25 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">DA</p>
              <p className="text-muted-foreground/60 text-[10px]">Divisão Administrativa</p>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ação..." className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted/40 border border-border text-foreground/70 placeholder:text-muted-foreground/50 text-xs outline-none focus:border-amber-400/30 focus:bg-muted/60 transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground" /></button>}
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-border">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)} className={`px-2 py-0.5 rounded-full text-[11px] transition-all ${activeCategory === c ? "bg-amber-500/20 border border-amber-400/30 text-amber-300" : "bg-muted/40 border border-border text-muted-foreground hover:text-foreground/60"}`}>{c}</button>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground/50 text-xs text-center py-6">Nenhuma ação encontrada</p>
          ) : (
            filtered.map(a => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => sendMessage(a.prompt)} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left group">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-400/15 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground/70 text-xs font-medium group-hover:text-foreground/90 truncate">{a.label}</p>
                    <p className="text-muted-foreground/50 text-[10px]">{a.category}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-amber-400 shrink-0 transition-colors" />
                </button>
              );
            })
          )}
        </div>

        {/* Legal refs */}
        <div className="border-t border-border px-3 py-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-muted-foreground/60 text-[10px] uppercase tracking-wider">Base Normativa</p>
          </div>
          {LEGAL_REFS.map(r => (
            <div key={r.label} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400/40 shrink-0 mt-1.5" />
              <div>
                <p className="text-amber-400/80 text-[11px] font-mono font-medium">{r.label}</p>
                <p className="text-muted-foreground/50 text-[10px]">{r.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-sidebar shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-foreground font-medium text-sm">Assistente Administrativo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <button onClick={() => { setMessages([WELCOME]); setActiveDoc(null); }} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground/60 text-xs transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />Nova conversa
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-5">
          {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border bg-sidebar shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={2}
                placeholder="Descreva o documento ou dúvida administrativa..."
                className="w-full px-4 py-3 rounded-xl bg-muted/40 border border-border text-foreground/80 placeholder:text-muted-foreground/50 text-sm outline-none focus:border-amber-400/30 focus:bg-muted/60 resize-none transition-all"
              />
              <p className="absolute bottom-2 right-3 text-muted-foreground/30 text-[10px]">Enter para enviar</p>
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 hover:border-amber-400/50 flex items-center justify-center text-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mb-0.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <AlertCircle className="w-3 h-3 text-muted-foreground/40" />
            <p className="text-muted-foreground/40 text-[10px]">Sugestões baseadas em IA. Consulte sempre o setor jurídico para decisões formais.</p>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Document Output ── */}
      <div className={`flex flex-col border-l border-border bg-sidebar transition-all duration-300 ${activeDoc ? "w-80" : "w-0 overflow-hidden"}`}>
        {activeDoc && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400 rotate-45" />
                <span className="text-muted-foreground text-xs">Prévia do documento</span>
              </div>
              <button onClick={() => setActiveDoc(null)} className="w-6 h-6 rounded-lg hover:bg-muted/60 flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground/60" />
              </button>
            </div>
            <DocPanel doc={activeDoc} />
          </>
        )}
        {!activeDoc && (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto" />
              <p className="text-muted-foreground/40 text-xs">O documento gerado aparecerá aqui</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
