"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  FileCheck2,
  FileClock,
  Tractor,
  Database,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Check,
  Sparkles,
  AlertCircle,
  Hash,
  ChevronDown,
  ChevronUp,
  User2,
  Plane,
  Users,
  MapPin,
  Calendar,
} from "lucide-react";
import { reports as reportsApi, users as usersApi, ApiError } from "@/lib/api";
import type { User } from "@/types/report";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DocType = "RAI" | "MINUTA" | "RELATORIO_FINAL";
type Scope = "simplified" | "complete";

interface SubDef { id: string; title: string }
interface SectionDef {
  id: string;
  title: string;
  subsections: SubDef[];
  agroSubs?: SubDef[];
}

interface OccFormData {
  // Ocorrência
  number: string;
  date: string;
  time: string;
  classification: string;
  occurrenceType: string;
  aerodrome: string;
  coordLat: string;
  coordLon: string;
  invUnit: string;
  municipality: string;
  uf: string;
  // Aeronave
  acRegistration: string;
  acManufacturer: string;
  acModel: string;
  acOperator: string;
  acOperation: string;
  acDamage: string;
  // Pessoas
  crewFatal: string;
  crewSerious: string;
  crewMinor: string;
  crewNone: string;
  paxFatal: string;
  paxSerious: string;
  paxMinor: string;
  paxNone: string;
  thirdFatal: string;
  thirdSerious: string;
  thirdMinor: string;
}

const EMPTY_FORM: OccFormData = {
  number: "", date: "", time: "", classification: "", occurrenceType: "", aerodrome: "",
  coordLat: "", coordLon: "", invUnit: "", municipality: "", uf: "",
  acRegistration: "", acManufacturer: "", acModel: "", acOperator: "",
  acOperation: "", acDamage: "",
  crewFatal: "", crewSerious: "", crewMinor: "", crewNone: "",
  paxFatal: "", paxSerious: "", paxMinor: "", paxNone: "",
  thirdFatal: "", thirdSerious: "", thirdMinor: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Section templates
// ─────────────────────────────────────────────────────────────────────────────

const RAI_SIMPLIFIED: SectionDef[] = [
  {
    id: "sinopse", title: "1. Sinopse",
    subsections: [
      { id: "descricao", title: "Descrição da Ocorrência" },
      { id: "classificacao", title: "Classificação" },
    ],
  },
  {
    id: "aeronave", title: "2. Aeronave Envolvida",
    subsections: [{ id: "identificacao", title: "Identificação e Dados Gerais" }],
    agroSubs: [
      { id: "sistema_aplicacao", title: "Sistema de Aplicação Agrícola" },
      { id: "produto_dosagem", title: "Produto Aplicado e Dosagem" },
    ],
  },
  {
    id: "tripulacao", title: "3. Tripulação",
    subsections: [{ id: "pic", title: "Piloto em Comando" }],
    agroSubs: [{ id: "hab_agro", title: "Habilitação para Aviação Agrícola" }],
  },
  {
    id: "ocorrencia", title: "4. Informações da Ocorrência",
    subsections: [
      { id: "local", title: "Local e Condições Ambientais" },
      { id: "fase_voo", title: "Fase do Voo" },
    ],
    agroSubs: [
      { id: "operacao_agro", title: "Operação Agrícola em Curso" },
      { id: "area_cultura", title: "Área e Cultura em Tratamento" },
    ],
  },
  {
    id: "analise", title: "5. Análise Preliminar",
    subsections: [{ id: "fatores", title: "Fatores Identificados Inicialmente" }],
  },
];

const RAI_COMPLETE: SectionDef[] = [
  {
    id: "sinopse", title: "1. Sinopse",
    subsections: [
      { id: "descricao", title: "Descrição da Ocorrência" },
      { id: "local_data", title: "Local, Data e Hora" },
      { id: "classificacao", title: "Classificação" },
    ],
  },
  {
    id: "historico", title: "2. Histórico do Voo",
    subsections: [
      { id: "fase", title: "Fase do Voo" },
      { id: "natureza", title: "Natureza da Operação" },
      { id: "plano", title: "Plano de Voo" },
    ],
    agroSubs: [
      { id: "tipo_aplicacao", title: "Tipo de Aplicação Agrícola" },
      { id: "parametros", title: "Faixa e Velocidade de Aplicação" },
    ],
  },
  {
    id: "lesoes", title: "3. Lesões às Pessoas",
    subsections: [
      { id: "tripulacao", title: "Tripulação" },
      { id: "passageiros", title: "Passageiros" },
      { id: "terceiros", title: "Terceiros" },
    ],
  },
  {
    id: "danos", title: "4. Danos à Aeronave",
    subsections: [{ id: "descricao", title: "Descrição dos Danos" }],
    agroSubs: [{ id: "danos_equip", title: "Danos ao Sistema de Aplicação" }],
  },
  {
    id: "pessoal", title: "5. Informações sobre o Pessoal",
    subsections: [
      { id: "pic", title: "Piloto em Comando" },
      { id: "demais", title: "Demais Tripulantes" },
    ],
    agroSubs: [{ id: "cert_agro", title: "Certificação para Aviação Agrícola" }],
  },
  {
    id: "aeronave", title: "6. Informações sobre a Aeronave",
    subsections: [
      { id: "matricula", title: "Matrícula e Certificação" },
      { id: "manutencao", title: "Histórico de Manutenção" },
      { id: "peso", title: "Peso e Balancete" },
    ],
    agroSubs: [
      { id: "cert_anac_mapa", title: "Certificação ANAC / Registro MAPA" },
      { id: "sistema_pulv", title: "Sistema de Pulverização/Dispersão" },
      { id: "calda", title: "Calda Fitossanitária — Tipo, Volume e Dosagem" },
    ],
  },
  {
    id: "meteorologia", title: "7. Informações Meteorológicas",
    subsections: [
      { id: "condicoes", title: "Condições na Área da Ocorrência" },
      { id: "relatorios", title: "Relatórios Meteorológicos" },
    ],
    agroSubs: [{ id: "janela_agro", title: "Janela Meteorológica para Aplicação Agrícola" }],
  },
  {
    id: "comunicacoes", title: "8. Comunicações",
    subsections: [{ id: "registros", title: "Registros de Comunicação" }],
  },
  {
    id: "local", title: "9. Informações sobre o Local",
    subsections: [{ id: "caracteristicas", title: "Características do Local" }],
    agroSubs: [
      { id: "area_agro", title: "Área de Aplicação Agrícola" },
      { id: "obstaculos", title: "Obstáculos e Riscos na Área" },
      { id: "infraestrutura", title: "Infraestrutura Rural" },
    ],
  },
  {
    id: "info_adicionais", title: "10. Informações Adicionais",
    subsections: [{ id: "outras", title: "Outras Informações Relevantes" }],
    agroSubs: [
      { id: "rbac137", title: "Conformidade com o RBAC 137" },
      { id: "fispq", title: "FISPQ do Produto Aplicado" },
    ],
  },
  {
    id: "analise", title: "11. Análise Preliminar",
    subsections: [
      { id: "sequencia", title: "Sequência de Eventos" },
      { id: "fatores", title: "Fatores Identificados" },
    ],
  },
  {
    id: "conclusoes", title: "12. Conclusões Preliminares",
    subsections: [
      { id: "causa", title: "Causa Provável Preliminar" },
      { id: "contrib", title: "Fatores Contribuintes Preliminares" },
    ],
  },
];

const MINUTA_SIMPLIFIED: SectionDef[] = [
  {
    id: "sinopse", title: "1. Sinopse",
    subsections: [
      { id: "descricao", title: "Descrição da Ocorrência" },
      { id: "classificacao", title: "Classificação" },
    ],
  },
  {
    id: "aeronave", title: "2. Aeronave Envolvida",
    subsections: [{ id: "identificacao", title: "Identificação e Dados Gerais" }],
    agroSubs: [
      { id: "caract_agro", title: "Características como Aeronave Aeroagrícola" },
      { id: "sistema_aplicacao", title: "Sistema de Aplicação" },
    ],
  },
  {
    id: "tripulacao", title: "3. Tripulação",
    subsections: [{ id: "pic", title: "Piloto em Comando" }],
    agroSubs: [{ id: "hab_agro", title: "Habilitação e Experiência em Aviação Agrícola" }],
  },
  {
    id: "narrativa", title: "4. Narrativa",
    subsections: [
      { id: "descricao", title: "Descrição Detalhada do Evento" },
      { id: "sequencia", title: "Sequência de Eventos" },
    ],
    agroSubs: [
      { id: "operacao_agro", title: "Operação Agrícola em Curso" },
      { id: "fase_aplicacao", title: "Fase da Aplicação ao Momento da Ocorrência" },
    ],
  },
  {
    id: "meteorologia", title: "5. Informações Meteorológicas",
    subsections: [{ id: "condicoes", title: "Condições Atmosféricas" }],
    agroSubs: [{ id: "cond_aplicacao", title: "Condições para Aplicação Agrícola" }],
  },
  {
    id: "fatores", title: "6. Fatores Contribuintes",
    subsections: [
      { id: "identificados", title: "Fatores Identificados" },
      { id: "analise", title: "Análise dos Fatores" },
    ],
  },
  {
    id: "conclusao", title: "7. Conclusão",
    subsections: [
      { id: "causa", title: "Causa Provável" },
      { id: "contrib", title: "Fatores Contribuintes" },
    ],
  },
];

const FULL_COMPLETE: SectionDef[] = [
  {
    id: "sinopse", title: "1. Sinopse",
    subsections: [
      { id: "descricao", title: "Descrição da Ocorrência" },
      { id: "local_data", title: "Local, Data e Hora" },
      { id: "classificacao", title: "Classificação" },
    ],
  },
  {
    id: "historico", title: "2. Histórico do Voo",
    subsections: [
      { id: "fase", title: "Fase do Voo" },
      { id: "natureza", title: "Natureza da Operação" },
      { id: "plano", title: "Plano de Voo" },
    ],
    agroSubs: [
      { id: "tipo_op_agro", title: "Tipo de Operação Agrícola" },
      { id: "parametros", title: "Parâmetros da Aplicação (faixa, velocidade, altura)" },
    ],
  },
  {
    id: "lesoes", title: "3. Lesões às Pessoas",
    subsections: [
      { id: "tripulacao", title: "Tripulação" },
      { id: "passageiros", title: "Passageiros" },
      { id: "terceiros", title: "Terceiros" },
    ],
  },
  {
    id: "danos", title: "4. Danos à Aeronave",
    subsections: [
      { id: "descricao", title: "Descrição dos Danos" },
      { id: "fotos", title: "Registro Fotográfico" },
    ],
    agroSubs: [{ id: "danos_agro", title: "Danos ao Sistema de Aplicação Agrícola" }],
  },
  {
    id: "pessoal", title: "5. Informações sobre o Pessoal",
    subsections: [
      { id: "pic", title: "Piloto em Comando" },
      { id: "copiloto", title: "Co-Piloto (se aplicável)" },
      { id: "outros", title: "Outros Membros da Tripulação" },
    ],
    agroSubs: [
      { id: "cert_agro", title: "Certificação para Aviação Agrícola (PA)" },
      { id: "exp_agro", title: "Experiência em Operações Aeroagrícolas" },
    ],
  },
  {
    id: "aeronave", title: "6. Informações sobre a Aeronave",
    subsections: [
      { id: "matricula", title: "Matrícula e Certificado de Aeronavegabilidade" },
      { id: "motor_helice", title: "Motor e Hélice" },
      { id: "manutencao", title: "Histórico de Manutenção" },
      { id: "peso", title: "Peso e Balancete" },
      { id: "combustivel", title: "Combustível" },
    ],
    agroSubs: [
      { id: "cert_anac_mapa", title: "Certificação ANAC / Registro MAPA" },
      { id: "sistema_pulv", title: "Sistema de Pulverização / Dispersão" },
      { id: "tanque", title: "Capacidade e Estado dos Tanques" },
      { id: "calda", title: "Calda Fitossanitária — Tipo, Volume e Dosagem" },
    ],
  },
  {
    id: "meteorologia", title: "7. Informações Meteorológicas",
    subsections: [
      { id: "condicoes", title: "Condições na Área da Ocorrência" },
      { id: "forecast", title: "Previsão Meteorológica" },
      { id: "vento", title: "Vento e Visibilidade" },
    ],
    agroSubs: [
      { id: "janela_agro", title: "Janela Meteorológica para Aplicação Agrícola" },
      { id: "inversao", title: "Inversão Térmica e Deriva de Calda" },
    ],
  },
  {
    id: "ajudas_nav", title: "8. Ajudas à Navegação",
    subsections: [{ id: "equipamentos", title: "Equipamentos de Navegação Utilizados" }],
    agroSubs: [{ id: "gps_agro", title: "GPS e Sistemas de Guiamento Agrícola" }],
  },
  {
    id: "comunicacoes", title: "9. Comunicações",
    subsections: [
      { id: "registros", title: "Registros de Comunicação" },
      { id: "frequencias", title: "Frequências Utilizadas" },
    ],
  },
  {
    id: "aerodromo", title: "10. Informações sobre o Aeródromo / Local de Operação",
    subsections: [
      { id: "caracteristicas", title: "Características do Aeródromo ou Local" },
      { id: "facilidades", title: "Facilidades e Serviços Disponíveis" },
    ],
    agroSubs: [
      { id: "pista_agro", title: "Pista Agrícola / Faixa de Pouso e Decolagem" },
      { id: "area_tratamento", title: "Área em Tratamento (Cultura e Talhão)" },
      { id: "obstaculos_area", title: "Obstáculos na Área de Aplicação" },
    ],
  },
  {
    id: "registradores", title: "11. Registradores de Voo",
    subsections: [{ id: "cvr_fdr", title: "CVR / FDR (se instalados)" }],
    agroSubs: [{ id: "telemetria", title: "Dados de Telemetria Agrícola (se disponível)" }],
  },
  {
    id: "impacto", title: "12. Informações sobre o Impacto",
    subsections: [
      { id: "descricao", title: "Descrição do Impacto" },
      { id: "evidencias", title: "Evidências no Terreno" },
    ],
    agroSubs: [{ id: "dano_ambiental", title: "Danos Ambientais / Contaminação do Solo" }],
  },
  {
    id: "medico", title: "13. Aspectos Médicos e Patológicos",
    subsections: [
      { id: "exames", title: "Exames Realizados" },
      { id: "substancias", title: "Substâncias Identificadas" },
    ],
    agroSubs: [{ id: "intoxicacao", title: "Intoxicação por Agrotóxico (se aplicável)" }],
  },
  {
    id: "incendio", title: "14. Incêndio",
    subsections: [{ id: "descricao", title: "Descrição e Combate ao Incêndio" }],
  },
  {
    id: "sobrevivencia", title: "15. Questões de Sobrevivência",
    subsections: [
      { id: "epi", title: "Equipamentos de Proteção Individual" },
      { id: "resgate", title: "Operações de Resgate" },
    ],
    agroSubs: [{ id: "epi_agro", title: "EPI Específico para Aplicação de Agrotóxicos" }],
  },
  {
    id: "testes", title: "16. Testes e Pesquisas",
    subsections: [
      { id: "laboratorio", title: "Análises Laboratoriais" },
      { id: "simulacoes", title: "Simulações Realizadas" },
    ],
  },
  {
    id: "organizacional", title: "17. Informações Organizacionais e de Gerenciamento",
    subsections: [
      { id: "empresa", title: "Empresa Aérea / Operador" },
      { id: "gerenciamento", title: "Aspectos de Gerenciamento" },
    ],
    agroSubs: [
      { id: "empresa_agro", title: "Empresa de Aplicação Aérea Agrícola" },
      { id: "produtor", title: "Produtor Rural / Contratante" },
      { id: "sms_agro", title: "SMS e Manuais de Operações Agrícolas" },
    ],
  },
  {
    id: "info_adicionais", title: "18. Informações Adicionais",
    subsections: [{ id: "outras", title: "Outras Informações Relevantes" }],
    agroSubs: [
      { id: "rbac137", title: "Análise de Conformidade com o RBAC 137" },
      { id: "fispq", title: "FISPQ do Produto Aplicado" },
      { id: "receituario", title: "Receituário Agronômico" },
    ],
  },
  {
    id: "analise", title: "19. Análise",
    subsections: [
      { id: "fatores_humanos", title: "Fatores Humanos" },
      { id: "fatores_materiais", title: "Fatores Materiais" },
      { id: "fatores_operacionais", title: "Fatores Operacionais" },
      { id: "fatores_ambientais", title: "Fatores Ambientais" },
    ],
    agroSubs: [
      { id: "analise_op_agro", title: "Análise da Operação Agrícola" },
      { id: "analise_rbac137", title: "Análise da Conformidade Normativa (RBAC 137)" },
    ],
  },
  {
    id: "conclusao", title: "20. Conclusão",
    subsections: [
      { id: "causa", title: "Causa Provável" },
      { id: "contrib", title: "Fatores Contribuintes" },
    ],
  },
  {
    id: "recomendacoes", title: "21. Recomendações de Segurança",
    subsections: [
      { id: "lista", title: "Recomendações" },
      { id: "destinatarios", title: "Destinatários e Responsáveis" },
    ],
  },
];

const RF_SIMPLIFIED: SectionDef[] = [
  {
    id: "sinopse", title: "1. Sinopse",
    subsections: [
      { id: "descricao", title: "Descrição da Ocorrência" },
      { id: "classificacao", title: "Classificação" },
    ],
  },
  {
    id: "aeronave", title: "2. Aeronave Envolvida",
    subsections: [{ id: "identificacao", title: "Identificação e Dados Gerais" }],
    agroSubs: [
      { id: "caract_agro", title: "Características como Aeronave Aeroagrícola" },
      { id: "sistema_aplicacao", title: "Sistema de Aplicação" },
    ],
  },
  {
    id: "tripulacao", title: "3. Tripulação",
    subsections: [{ id: "pic", title: "Piloto em Comando" }],
    agroSubs: [{ id: "hab_agro", title: "Habilitação para Aviação Agrícola" }],
  },
  {
    id: "meteorologia", title: "4. Informações Meteorológicas",
    subsections: [{ id: "condicoes", title: "Condições Atmosféricas" }],
  },
  {
    id: "narrativa", title: "5. Narrativa",
    subsections: [
      { id: "descricao", title: "Descrição Detalhada" },
      { id: "sequencia", title: "Sequência de Eventos" },
    ],
    agroSubs: [
      { id: "fase_op_agro", title: "Fase da Operação Agrícola" },
      { id: "local_cultura", title: "Local e Cultura em Tratamento" },
    ],
  },
  {
    id: "analise", title: "6. Análise",
    subsections: [
      { id: "fatores_humanos", title: "Fatores Humanos" },
      { id: "fatores_materiais", title: "Fatores Materiais" },
      { id: "fatores_operacionais", title: "Fatores Operacionais" },
    ],
    agroSubs: [
      { id: "analise_op_agro", title: "Análise da Operação Agrícola" },
      { id: "conformidade_rbac137", title: "Conformidade com o RBAC 137" },
    ],
  },
  {
    id: "conclusao", title: "7. Conclusão",
    subsections: [
      { id: "causa", title: "Causa Provável" },
      { id: "contrib", title: "Fatores Contribuintes" },
    ],
  },
  {
    id: "recomendacoes", title: "8. Recomendações de Segurança",
    subsections: [{ id: "lista", title: "Recomendações" }],
  },
];

const TEMPLATES: Record<DocType, Record<Scope, SectionDef[]>> = {
  RAI: { simplified: RAI_SIMPLIFIED, complete: RAI_COMPLETE },
  MINUTA: { simplified: MINUTA_SIMPLIFIED, complete: FULL_COMPLETE },
  RELATORIO_FINAL: { simplified: RF_SIMPLIFIED, complete: FULL_COMPLETE },
};

// ─────────────────────────────────────────────────────────────────────────────
// Build sections payload
// ─────────────────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function isFormEmpty(form: OccFormData): boolean {
  return !form.date && !form.classification && !form.acRegistration;
}

function td(label: string, value: string, span = 1) {
  return `<td class="sipaer-label">${label}</td><td class="sipaer-value"${span > 1 ? ` colspan="${span}"` : ""}>${value || "&nbsp;"}</td>`;
}

function buildOccurrenceHTML(form: OccFormData, investigator: string): string {
  const occType = OCCURRENCE_TYPE_OPTIONS.find(o => o.value === form.occurrenceType);
  const classLabel = CLASSIFICATION_OPTIONS.find(o => o.value === form.classification)?.label ?? form.classification;
  const damageLabel = DAMAGE_OPTIONS.find(o => o.value === form.acDamage)?.label ?? form.acDamage;
  const operLabel = OPERATION_OPTIONS.find(o => o.value === form.acOperation)?.label ?? form.acOperation;

  const dateStr = form.date
    ? new Date(form.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
  const datetimeStr = [dateStr, form.time ? `${form.time} (UTC)` : ""].filter(Boolean).join(" — ");
  const coords = [form.coordLat, form.coordLon].filter(Boolean).join("  ");
  const municipioUF = [form.municipality, form.uf].filter(Boolean).join("/");

  const occTable = `<table class="sipaer-table"><tbody>
<tr><th class="sipaer-header" colspan="4">DADOS DA OCORRÊNCIA</th></tr>
<tr>${td("DATA - HORA", datetimeStr)}${td("INVESTIGAÇÃO", form.invUnit)}</tr>
<tr>${td("SUMA Nº", form.number)}${td("CLASSIFICAÇÃO", classLabel)}</tr>
<tr>${td("TIPO", occType ? `[${occType.value}] ${occType.label.split("—")[1]?.trim() ?? occType.value}` : "", 3)}</tr>
<tr>${td("AERÓDROMO", form.aerodrome)}${td("MUNICÍPIO/UF", municipioUF)}</tr>
<tr>${td("COORDENADAS", coords, 3)}</tr>
<tr>${td("INVESTIGADOR ENCARREGADO", investigator, 3)}</tr>
</tbody></table>`;

  const acTable = `<table class="sipaer-table"><tbody>
<tr><th class="sipaer-header" colspan="6">DADOS DA AERONAVE</th></tr>
<tr>${td("MATRÍCULA", form.acRegistration)}${td("FABRICANTE", form.acManufacturer)}${td("MODELO", form.acModel)}</tr>
<tr>${td("OPERADOR", form.acOperator, 3)}${td("OPERAÇÃO", operLabel)}</tr>
<tr>${td("DANOS À AERONAVE", damageLabel, 5)}</tr>
</tbody></table>`;

  const rows = [
    { label: "Tripulantes", none: form.crewNone, minor: form.crewMinor, serious: form.crewSerious, fatal: form.crewFatal },
    { label: "Passageiros", none: form.paxNone, minor: form.paxMinor, serious: form.paxSerious, fatal: form.paxFatal },
    { label: "Terceiros", none: "", minor: form.thirdMinor, serious: form.thirdSerious, fatal: form.thirdFatal },
  ];

  const personRows = rows.map(r =>
    `<tr><td class="sipaer-label">${r.label}</td><td class="sipaer-value">${r.none || "&nbsp;"}</td><td class="sipaer-value">${r.minor || "&nbsp;"}</td><td class="sipaer-value">${r.serious || "&nbsp;"}</td><td class="sipaer-value">${r.fatal || "&nbsp;"}</td></tr>`
  ).join("");

  const personsTable = `<table class="sipaer-table"><tbody>
<tr><th class="sipaer-header" colspan="5">LESÕES E DANOS A PESSOAS A BORDO</th></tr>
<tr><th class="sipaer-col-header">&nbsp;</th><th class="sipaer-col-header">Ileso</th><th class="sipaer-col-header">Leve</th><th class="sipaer-col-header">Grave</th><th class="sipaer-col-header">Fatal</th></tr>
${personRows}
</tbody></table>`;

  return occTable + acTable + personsTable;
}

function buildSections(type: DocType, scope: Scope, agro: boolean, form?: OccFormData, investigator?: string) {
  const pfx = `${type.toLowerCase()}-${uid()}`;
  const initialHTML = form && !isFormEmpty(form) ? buildOccurrenceHTML(form, investigator ?? "") : "";

  return TEMPLATES[type][scope].map((sec, si) => {
    const allSubs = [
      ...sec.subsections,
      ...(agro && sec.agroSubs ? sec.agroSubs : []),
    ];
    return {
      id: `${pfx}-${sec.id}`,
      title: sec.title,
      order: si + 1,
      content: "",
      isCompleted: false,
      subsections: allSubs.map((sub, sj) => ({
        id: `${pfx}-${sec.id}-${sub.id}`,
        title: sub.title,
        order: sj + 1,
        // Injeta o HTML na primeira subseção da primeira seção
        content: si === 0 && sj === 0 ? initialHTML : "",
        isCompleted: false,
      })),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI constants
// ─────────────────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  {
    id: "RAI" as DocType,
    icon: FileClock,
    label: "RAI",
    full: "Relatório de Análise de Informações",
    desc: "Documento inicial com informações e análise preliminar da ocorrência.",
    color: "#f59e0b",
  },
  {
    id: "MINUTA" as DocType,
    icon: FileText,
    label: "Minuta",
    full: "Minuta de Relatório",
    desc: "Versão intermediária para revisão e validação antes da publicação final.",
    color: "#8b5cf6",
  },
  {
    id: "RELATORIO_FINAL" as DocType,
    icon: FileCheck2,
    label: "Relatório Final",
    full: "Relatório Final de Investigação",
    desc: "Documento definitivo com toda a investigação concluída e aprovada.",
    color: "#10b981",
  },
];

const SCOPE_OPTIONS = [
  {
    id: "simplified" as Scope,
    label: "Simplificado",
    desc: "Estrutura enxuta para ocorrências de menor complexidade operacional.",
    tags: ["Ágil", "Seções essenciais"],
  },
  {
    id: "complete" as Scope,
    label: "Completo",
    desc: "Estrutura integral conforme NSCA 3-13 e Anexo 13 ICAO. Todas as seções obrigatórias.",
    tags: ["NSCA 3-13", "Anexo 13 ICAO", "Todas as seções"],
  },
];

const CLASSIFICATION_OPTIONS = [
  { value: "ACIDENTE", label: "Acidente" },
  { value: "INCIDENTE_GRAVE", label: "Incidente Grave" },
  { value: "INCIDENTE", label: "Incidente" },
];

const OCCURRENCE_TYPE_OPTIONS = [
  { value: "LOC-G",   label: "LOC-G — Perda de controle no solo" },
  { value: "LOC-I",   label: "LOC-I — Perda de controle em voo" },
  { value: "RE",      label: "RE — Excursão de pista" },
  { value: "CFIT",    label: "CFIT — Voo controlado ao solo/água" },
  { value: "MAC",     label: "MAC — Colisão em voo" },
  { value: "GCOL",    label: "GCOL — Colisão no solo" },
  { value: "F-NI",    label: "F-NI — Fogo/Fumaça (não relacionado a impacto)" },
  { value: "FUEL",    label: "FUEL — Combustível" },
  { value: "SCF-NP",  label: "SCF-NP — Falha de sistema não propulsivo" },
  { value: "SCF-PP",  label: "SCF-PP — Falha de sistema propulsivo" },
  { value: "BIRD",    label: "BIRD — Colisão com pássaro/fauna" },
  { value: "TURB",    label: "TURB — Turbulência" },
  { value: "WSTRW",   label: "WSTRW — Windshear / Cisalhamento de vento" },
  { value: "UNK",     label: "UNK — Desconhecido" },
];

const DAMAGE_OPTIONS = [
  { value: "NENHUM", label: "Nenhum" },
  { value: "LEVE", label: "Leve" },
  { value: "SUBSTANCIAL", label: "Substancial" },
  { value: "DESTRUÍDA", label: "Destruída" },
];

const OPERATION_OPTIONS = [
  { value: "AEROAGRICOLA", label: "Aeroagrícola" },
  { value: "INSTRUCAO", label: "Instrução" },
  { value: "PRIVADA", label: "Privada (não regular)" },
  { value: "TAXI_AEREO", label: "Táxi Aéreo" },
  { value: "SAE", label: "Serviço Aéreo Especializado" },
  { value: "REGULAR", label: "Transporte Público Regular" },
  { value: "OUTRO", label: "Outro" },
];

const INV_UNITS = [
  "SERIPA I", "SERIPA II", "SERIPA III",
  "SERIPA IV", "SERIPA V", "SERIPA VI",
  "SERIPA VII", "CENIPA",
];

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const STEPS = ["Documento", "Escopo", "Configuração", "Dados", "Confirmar"];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                    ? "bg-blue-600/20 border-2 border-blue-500 text-blue-400"
                    : "bg-white/[0.05] border border-white/[0.1] text-white/20"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  active ? "text-blue-400" : done ? "text-white/50" : "text-white/20"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-5 transition-all ${
                  done ? "bg-blue-500/50" : "bg-white/[0.07]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionPreview({ sections, agro }: { sections: SectionDef[]; agro: boolean }) {
  const [open, setOpen] = useState(false);
  const total = sections.reduce(
    (acc, s) => acc + s.subsections.length + (agro && s.agroSubs ? s.agroSubs.length : 0),
    0
  );
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/60 hover:text-white/80 transition-colors"
      >
        <span>
          <span className="text-white/80 font-medium">{sections.length}</span> seções ·{" "}
          <span className="text-white/80 font-medium">{total}</span> subseções
          {agro && (
            <span className="ml-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              + Aeroagrícola
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && (
        <ul className="border-t border-white/[0.05] max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
          {sections.map((sec) => (
            <li key={sec.id} className="px-4 py-2.5">
              <p className="text-white/70 text-xs font-medium">{sec.title}</p>
              <ul className="mt-1 space-y-0.5">
                {sec.subsections.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-1.5 text-white/35 text-xs pl-3">
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    {sub.title}
                  </li>
                ))}
                {agro && sec.agroSubs?.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-1.5 text-emerald-400/70 text-xs pl-3">
                    <Tractor className="w-2.5 h-2.5 shrink-0" />
                    {sub.title}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// shared field styles
const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all";
const selectCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#0d1e30] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all";
const labelCls = "block text-xs text-white/45 font-medium mb-1.5";
const sectionHeadCls =
  "flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-widest mb-4 mt-6 first:mt-0";

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState<DocType | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [isAgro, setIsAgro] = useState(false);
  const [useDedalo, setUseDedalo] = useState(false);
  const [investigator, setInvestigator] = useState("");
  const [form, setForm] = useState<OccFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [investigatorList, setInvestigatorList] = useState<User[]>([]);

  useEffect(() => {
    usersApi.list().then(setInvestigatorList).catch(() => {});
  }, []);

  function setField<K extends keyof OccFormData>(key: K, value: OccFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!docType || !scope) return;
    setError("");
    setSubmitting(true);
    try {
      const sections = buildSections(docType, scope, isAgro, useDedalo ? undefined : form, investigator);
      const occurrence: Record<string, unknown> = {
        docType,
        scope,
        isAgricultural: isAgro,
        source: useDedalo ? "dedalo" : "manual",
        investigator: investigator.trim() || undefined,
        ...(useDedalo
          ? { sumaNumber: form.number || undefined }
          : {
              sumaNumber: form.number || undefined,
              date: form.date || undefined,
              time: form.time || undefined,
              classification: form.classification || undefined,
              occurrenceType: form.occurrenceType || undefined,
              aerodrome: form.aerodrome || undefined,
              coordinates: (form.coordLat || form.coordLon)
                ? { lat: form.coordLat, lon: form.coordLon }
                : undefined,
              investigationUnit: form.invUnit || undefined,
              municipality: form.municipality || undefined,
              uf: form.uf || undefined,
              aircraft: {
                registration: form.acRegistration || undefined,
                manufacturer: form.acManufacturer || undefined,
                model: form.acModel || undefined,
                operator: form.acOperator || undefined,
                operation: form.acOperation || undefined,
                damage: form.acDamage || undefined,
              },
              persons: {
                crew: { fatal: form.crewFatal, serious: form.crewSerious, minor: form.crewMinor, none: form.crewNone },
                passengers: { fatal: form.paxFatal, serious: form.paxSerious, minor: form.paxMinor, none: form.paxNone },
                thirdParty: { fatal: form.thirdFatal, serious: form.thirdSerious, minor: form.thirdMinor },
              },
            }
        ),
      };
      const report = await reportsApi.create({ occurrence, sections });
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar relatório. Tente novamente.");
      setSubmitting(false);
    }
  }

  const canNext =
    (step === 0 && docType !== null) ||
    (step === 1 && scope !== null) ||
    (step === 2 && investigator.trim() !== "") ||
    step === 3 ||
    step === 4;

  const sections = docType && scope ? TEMPLATES[docType][scope] : [];
  const selectedDoc = DOC_TYPES.find((d) => d.id === docType);
  const selectedScope = SCOPE_OPTIONS.find((s) => s.id === scope);

  return (
    <div className="flex-1 h-full overflow-auto bg-[#07111f]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para relatórios
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">Novo Relatório</h1>
        <p className="text-white/40 text-sm mb-8">
          Preencha as etapas abaixo para configurar a estrutura do documento.
        </p>

        <StepBar current={step} />

        {/* ── Step 0: Tipo de Documento ────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-white/60 text-sm font-medium mb-4">
              Qual documento deseja produzir?
            </p>
            {DOC_TYPES.map((dt) => {
              const Icon = dt.icon;
              const selected = docType === dt.id;
              return (
                <button
                  key={dt.id}
                  type="button"
                  onClick={() => setDocType(dt.id)}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                    selected
                      ? "border-blue-500/50 bg-blue-600/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${dt.color}18`, border: `1px solid ${dt.color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: dt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{dt.label}</span>
                      <span className="text-white/35 text-xs">— {dt.full}</span>
                    </div>
                    <p className="text-white/45 text-xs mt-1 leading-relaxed">{dt.desc}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-all ${
                      selected ? "border-blue-400 bg-blue-500" : "border-white/20"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 1: Escopo ───────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-white/60 text-sm font-medium mb-4">
              Qual o escopo do documento?
            </p>
            {SCOPE_OPTIONS.map((opt) => {
              const selected = scope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScope(opt.id)}
                  className={`w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200 ${
                    selected
                      ? "border-blue-500/50 bg-blue-600/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{opt.label}</span>
                    </div>
                    <p className="text-white/45 text-sm leading-relaxed mb-3">{opt.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opt.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] text-white/40 border border-white/[0.08]">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {docType && (
                      <div className="mt-3">
                        <SectionPreview sections={TEMPLATES[docType][opt.id]} agro={false} />
                      </div>
                    )}
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 transition-all ${
                      selected ? "border-blue-400 bg-blue-500" : "border-white/20"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 2: Configuração ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm font-medium mb-4">
              Configure as opções do documento.
            </p>

            {/* Investigador responsável */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-3">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                  <User2 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/80 font-medium text-sm">Investigador Responsável</p>
                  <p className="text-white/35 text-xs">Responsável pela elaboração deste documento.</p>
                </div>
              </div>
              <select
                value={investigator}
                onChange={(e) => setInvestigator(e.target.value)}
                className={selectCls}
                autoFocus
              >
                <option value="">Selecionar investigador...</option>
                {investigatorList.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.postoGraduacao ? `${u.postoGraduacao} ${u.name}` : u.name} — {u.unit}
                  </option>
                ))}
              </select>
              {step === 2 && !investigator.trim() && (
                <p className="text-xs text-amber-400/70 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Campo obrigatório para continuar.
                </p>
              )}
            </div>

            {/* Aeroagrícola toggle */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                isAgro ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <Tractor className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white/80 font-medium text-sm">Aeronave Aeroagrícola</p>
                    <p className="text-white/35 text-xs mt-0.5 leading-relaxed">
                      Adiciona seções específicas para operações agrícolas: sistema de
                      aplicação, calda fitossanitária, RBAC 137, área de tratamento,
                      FISPQ e conformidade normativa.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAgro((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${isAgro ? "bg-emerald-500" : "bg-white/10"}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      isAgro ? "left-5.5 translate-x-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              {isAgro && docType && scope && (
                <div className="mt-4 pt-4 border-t border-emerald-500/15">
                  <p className="text-emerald-400/70 text-xs font-medium mb-2">
                    Seções aeroagrícolas que serão adicionadas:
                  </p>
                  <SectionPreview sections={TEMPLATES[docType][scope]} agro={true} />
                </div>
              )}
            </div>

            {/* Dédalo toggle */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                useDedalo ? "border-blue-500/30 bg-blue-500/[0.06]" : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/80 font-medium text-sm">
                      Importar dados do sistema Dédalo
                    </p>
                    <p className="text-white/35 text-xs mt-0.5 leading-relaxed">
                      Pré-preenche os dados da ocorrência automaticamente a partir do número
                      de registro no Dédalo (CENIPA).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseDedalo((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${useDedalo ? "bg-blue-500" : "bg-white/10"}`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      useDedalo ? "left-5.5 translate-x-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Dados ────────────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            {useDedalo ? (
              /* ── Dédalo: só o número ── */
              <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white/80 font-medium text-sm">Sistema Dédalo — CENIPA</p>
                    <p className="text-white/35 text-xs">Informe o número da ocorrência para importação automática dos dados.</p>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Número da Ocorrência no Dédalo</label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      value={form.number}
                      onChange={(e) => setField("number", e.target.value.toUpperCase())}
                      placeholder="Ex: A-092/CENIPA/2024"
                      className={`${inputCls} pl-10 font-mono`}
                      autoFocus
                    />
                  </div>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-blue-400/60">
                  <Sparkles className="w-3 h-3 shrink-0 mt-0.5" />
                  Os dados da ocorrência serão pré-carregados no editor após a criação.
                </p>
              </div>
            ) : (
              /* ── Manual: formulário completo ── */
              <div>
                <p className="text-white/60 text-sm font-medium mb-6">
                  Preencha os dados da ocorrência manualmente.
                </p>

                {/* ── DADOS DA OCORRÊNCIA ── */}
                <div className={sectionHeadCls}>
                  <MapPin className="w-3.5 h-3.5" />
                  Dados da Ocorrência
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Número da Ocorrência</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                        <input
                          type="text"
                          value={form.number}
                          onChange={(e) => setField("number", e.target.value.toUpperCase())}
                          placeholder="A-092/CENIPA/2024"
                          className={`${inputCls} pl-9 font-mono text-xs`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Classificação <span className="text-red-400">*</span></label>
                      <select
                        value={form.classification}
                        onChange={(e) => setField("classification", e.target.value)}
                        className={selectCls}
                      >
                        <option value="">Selecionar...</option>
                        {CLASSIFICATION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Tipo da Ocorrência (ICAO)</label>
                    <select
                      value={form.occurrenceType}
                      onChange={(e) => setField("occurrenceType", e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Selecionar tipo...</option>
                      {OCCURRENCE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Data <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) => setField("date", e.target.value)}
                          className={`${inputCls} pl-9 [color-scheme:dark]`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Hora (UTC)</label>
                      <input
                        type="time"
                        value={form.time}
                        onChange={(e) => setField("time", e.target.value)}
                        className={`${inputCls} [color-scheme:dark]`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Aeródromo / Local de Operação</label>
                    <input
                      type="text"
                      value={form.aerodrome}
                      onChange={(e) => setField("aerodrome", e.target.value.toUpperCase())}
                      placeholder="Código ICAO ou descrição do local"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Município</label>
                      <input
                        type="text"
                        value={form.municipality}
                        onChange={(e) => setField("municipality", e.target.value)}
                        placeholder="Nome do município"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>UF</label>
                      <select
                        value={form.uf}
                        onChange={(e) => setField("uf", e.target.value)}
                        className={selectCls}
                      >
                        <option value="">UF</option>
                        {UF_LIST.map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Coordenada Lat.</label>
                      <input
                        type="text"
                        value={form.coordLat}
                        onChange={(e) => setField("coordLat", e.target.value)}
                        placeholder={`Ex: 04°57'34"S`}
                        className={`${inputCls} font-mono text-xs`}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Coordenada Long.</label>
                      <input
                        type="text"
                        value={form.coordLon}
                        onChange={(e) => setField("coordLon", e.target.value)}
                        placeholder={`Ex: 042°47'35"W`}
                        className={`${inputCls} font-mono text-xs`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Unidade de Investigação</label>
                    <select
                      value={form.invUnit}
                      onChange={(e) => setField("invUnit", e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Selecionar unidade...</option>
                      {INV_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── DADOS DA AERONAVE ── */}
                <div className={sectionHeadCls}>
                  <Plane className="w-3.5 h-3.5" />
                  Dados da Aeronave
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Matrícula</label>
                      <input
                        type="text"
                        value={form.acRegistration}
                        onChange={(e) => setField("acRegistration", e.target.value.toUpperCase())}
                        placeholder="PP-XXX"
                        className={`${inputCls} font-mono`}
                        maxLength={8}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Fabricante</label>
                      <input
                        type="text"
                        value={form.acManufacturer}
                        onChange={(e) => setField("acManufacturer", e.target.value.toUpperCase())}
                        placeholder="Ex: CESSNA, EMBRAER"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Modelo</label>
                      <input
                        type="text"
                        value={form.acModel}
                        onChange={(e) => setField("acModel", e.target.value.toUpperCase())}
                        placeholder="Ex: C172M, EMB-202"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Operador</label>
                      <input
                        type="text"
                        value={form.acOperator}
                        onChange={(e) => setField("acOperator", e.target.value)}
                        placeholder="Nome do operador"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Tipo de Operação</label>
                      <select
                        value={form.acOperation}
                        onChange={(e) => setField("acOperation", e.target.value)}
                        className={selectCls}
                      >
                        <option value="">Selecionar...</option>
                        {OPERATION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Danos à Aeronave</label>
                      <select
                        value={form.acDamage}
                        onChange={(e) => setField("acDamage", e.target.value)}
                        className={selectCls}
                      >
                        <option value="">Selecionar...</option>
                        {DAMAGE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── PESSOAS / LESÕES / DANOS ── */}
                <div className={sectionHeadCls}>
                  <Users className="w-3.5 h-3.5" />
                  Pessoas a Bordo / Lesões / Danos
                </div>
                <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                        <th className="text-left px-4 py-2.5 text-white/35 font-medium">Situação</th>
                        <th className="text-center px-3 py-2.5 text-white/35 font-medium">Tripulação</th>
                        <th className="text-center px-3 py-2.5 text-white/35 font-medium">Passageiros</th>
                        <th className="text-center px-3 py-2.5 text-white/35 font-medium">Terceiros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {[
                        { label: "Ilesos", crewKey: "crewNone", paxKey: "paxNone", thirdKey: null },
                        { label: "Feridos Leves", crewKey: "crewMinor", paxKey: "paxMinor", thirdKey: "thirdMinor" },
                        { label: "Feridos Graves", crewKey: "crewSerious", paxKey: "paxSerious", thirdKey: "thirdSerious" },
                        { label: "Fatais", crewKey: "crewFatal", paxKey: "paxFatal", thirdKey: "thirdFatal" },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5 text-white/50">{row.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={form[row.crewKey as keyof OccFormData]}
                              onChange={(e) => setField(row.crewKey as keyof OccFormData, e.target.value)}
                              className="w-full text-center px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-blue-500/40 transition-all"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={form[row.paxKey as keyof OccFormData]}
                              onChange={(e) => setField(row.paxKey as keyof OccFormData, e.target.value)}
                              className="w-full text-center px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-blue-500/40 transition-all"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {row.thirdKey ? (
                              <input
                                type="number"
                                min="0"
                                value={form[row.thirdKey as keyof OccFormData]}
                                onChange={(e) => setField(row.thirdKey as keyof OccFormData, e.target.value)}
                                className="w-full text-center px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-blue-500/40 transition-all"
                                placeholder="0"
                              />
                            ) : (
                              <span className="block text-center text-white/20">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Confirmar ────────────────────────────────────────────── */}
        {step === 4 && selectedDoc && selectedScope && docType && scope && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm font-medium mb-4">
              Revise as configurações antes de criar o relatório.
            </p>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-white/40 text-xs">Tipo de documento</span>
                <div className="flex items-center gap-2">
                  <selectedDoc.icon className="w-4 h-4" style={{ color: selectedDoc.color }} />
                  <span className="text-white/80 text-sm font-medium">{selectedDoc.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-white/40 text-xs">Escopo</span>
                <span className="text-white/80 text-sm font-medium">{selectedScope.label}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-white/40 text-xs">Investigador responsável</span>
                <span className="text-white/80 text-sm">{investigator}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-white/40 text-xs">Aviação Aeroagrícola</span>
                <span className={`text-sm font-medium ${isAgro ? "text-emerald-400" : "text-white/30"}`}>
                  {isAgro ? "Sim — seções específicas incluídas" : "Não"}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-white/40 text-xs">Dados da ocorrência</span>
                <span className="text-white/80 text-sm">
                  {useDedalo
                    ? `Dédalo${form.number ? ` — ${form.number}` : " (sem número)"}`
                    : form.number
                    ? form.number
                    : "Preenchimento manual"}
                </span>
              </div>
              {!useDedalo && (form.date || form.classification) && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-white/40 text-xs">Data / Classificação</span>
                  <span className="text-white/70 text-sm">
                    {[form.date, CLASSIFICATION_OPTIONS.find(c => c.value === form.classification)?.label].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
              {!useDedalo && form.occurrenceType && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-white/40 text-xs">Tipo da Ocorrência</span>
                  <span className="text-white/70 text-sm font-mono text-xs">
                    {form.occurrenceType}
                  </span>
                </div>
              )}
              {!useDedalo && form.acRegistration && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-white/40 text-xs">Aeronave</span>
                  <span className="text-white/70 text-sm font-mono">
                    {[form.acRegistration, form.acModel].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
            </div>

            <SectionPreview sections={sections} agro={isAgro} />

            {error && (
              <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.1] text-white/50 hover:text-white hover:border-white/20 disabled:opacity-0 disabled:pointer-events-none text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Criar Relatório
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
