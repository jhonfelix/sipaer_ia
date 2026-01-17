import type {
  Report,
  User,
  AIMessage,
  AIQuickAction,
} from "@/types/report";

export const mockUser: User = {
  id: "1",
  name: "João Felix",
  email: "jhorifelix@hotmail.com",
  role: "investigator",
  unit: "CENIPA",
};

export const mockReport: Report = {
  id: "rpt-001",
  occurrence: {
    id: "occ-001",
    sumaNumber: "A-092/CENIPA/2025",
    investigationUnit: "SERIPA II",
    dateTime: new Date("2025-06-14T15:16:00Z"),
    classification: "ACIDENTE",
    types: ["LOC-G", "RE"],
    location: {
      aerodrome: "SD7E",
      aerodromeName: "FAZENDA CANAÃ",
      municipality: "TERESINA",
      state: "PI",
      coordinates: {
        latitude: "04°57'34\"S",
        longitude: "042°47'35\"W",
      },
    },
    aircraft: [
      {
        registration: "PP-AFK",
        model: "172M",
        manufacturer: "CESSNA",
        serialNumber: "17263245",
        category: "Avião",
        yearOfManufacture: 1975,
        totalFlightHours: 8520,
        operator: "Particular",
        damage: "SUBSTANCIAL",
      },
    ],
    crew: [
      {
        role: "PILOTO",
        totalHours: 850,
        hoursInModel: 200,
        license: "PCH",
        validCMA: true,
        fatality: false,
        injury: "LEVE",
      },
    ],
    weather: {
      type: "VMC",
      wind: {
        direction: 120,
        speed: 12,
      },
      visibility: 9999,
      clouds: "FEW025",
      metar: "SBTE 141500Z 12012KT 9999 FEW025 32/22 Q1012",
    },
    passengers: {
      total: 2,
      fatalities: 0,
      serious: 0,
      minor: 1,
      none: 1,
    },
    thirdParty: {
      fatalities: 0,
      serious: 0,
      minor: 0,
    },
  },
  status: "draft",
  version: 1,
  sections: [
    {
      id: "sec-1",
      title: "Informações Factuais",
      order: 1,
      content: "",
      isCompleted: true,
      subsections: [
        {
          id: "sub-1-1",
          title: "Dados objetivos da ocorrência",
          order: 1,
          content: `<h2>Dados da Ocorrência</h2>
<p><strong>DATA - HORA:</strong> 14/JUN/2025 - 15:16 (UTC)</p>
<p><strong>INVESTIGAÇÃO:</strong> <a href="#">SERIPA II</a></p>
<p><strong>SUMA Nº:</strong> A-092/<a href="#">CENIPA</a>/2025</p>

<h3>Classificação da Ocorrência</h3>
<p><strong>CLASSIFICAÇÃO:</strong> ACIDENTE</p>
<p><strong>TIPO(S):</strong> [LOC-G] PERDA DE CONTROLE NO SOLO</p>
<p>[RE] EXCURSÃO DE PISTA</p>

<h3>Localização</h3>
<p><strong>AERÓDROMO:</strong> FAZENDA CANAÃ (SD7E)</p>
<p><strong>MUNICÍPIO:</strong> TERESINA</p>
<p><strong>UF:</strong> PI</p>
<p><strong>COORDENADAS:</strong> 04°57'34"S 042°47'35"W</p>

<h3>Informações Adicionais</h3>
<p>Digite / para acessar comandos rápidos e inserir diferentes tipos de blocos.</p>`,
          isCompleted: true,
        },
        {
          id: "sub-1-2",
          title: "Data, hora e local",
          order: 2,
          content: "<p><strong>DATA - HORA:</strong> 14/JUN/2025 - 15:16 (UTC)</p>",
          isCompleted: true,
        },
        {
          id: "sub-1-3",
          title: "Tipo de ocorrência",
          order: 3,
          content: "LOC-G (Perda de Controle no Solo)",
          isCompleted: true,
        },
        {
          id: "sub-1-4",
          title: "Aeronave(s) envolvida(s)",
          order: 4,
          content: `<p>Matrícula: PR-AGR</p>
              <p>Fabricante: ROBINSON</p>
              <p>Modelo: EMB-202A IPANEMA</p>
              <p>Tipo: Helicóptero</p>
              <p>Número de Série: 202001245</p>
              <p>Ano de Fabricação: 2019</p>
              <p>Danos à Aeronave:</p>

<p>Componentes Danificados: Hélice, trem de pouso principal esquerdo, asa esquerda (bordo de ataque), carenagem do motor.</p>`,
          isCompleted: true,
        },
        {
          id: "sub-1-5",
          title: "Condições meteorológicas",
          order: 5,
          content: `<p>Condições: VMC (Visual Meteorological Conditions)</p>
                    <p>Vento: 090°/08kt</p>
                    <p>Visibilidade: Superior a 10km</p>
                    <p>Teto: Céu claro</p>
                    <p>Temperatura: 28°C</p>`,
          isCompleted: true,
        },
        {
          id: "sub-1-6",
          title: "Dados da tripulação",
          order: 6,
          content: "",
          isCompleted: true,
        },
      ],
    },
    {
      id: "sec-2",
      title: "Histórico do Voo",
      order: 2,
      content: "",
      isCompleted: true,
      subsections: [
        {
          id: "sub-2-1",
          title: "Planejamento da Operação",
          order: 1,
          content: `No dia 15JAN2026, a aeronave PR-AGR decolou da pista de operação localizada na Fazenda Santa Clara, município de Presidente Prudente/SP, por volta das 06:30 (UTC), com o objetivo de realizar operação de pulverização aérea agrícola em lavoura de soja.

De acordo com relato do piloto, as condições meteorológicas estavam favoráveis para a operação, com vento calmo e boa visibilidade. A aeronave estava carregada com aproximadamente 600 litros de calda (mistura de defensivo agrícola e água), dentro dos limites de peso e balanceamento estabelecidos pelo fabricante.

O piloto informou que realizou procedimento padrão de decolagem, utilizando a pista de terra compactada de aproximadamente 800 metros de extensão. Durante a corrida de decolagem, em velocidade estimada de 55kt, a aeronave sofreu oscilação lateral inesperada.

Segundo o piloto, ao tentar corrigir a trajetória, a aeronave ultrapassou os limites laterais da pista, atingindo terreno irregular com vegetação rasteira. O trem de pouso principal esquerdo colapsou ao impactar uma irregularidade do terreno, fazendo com que a aeronave guinasse bruscamente para a esquerda.

A hélice atingiu o solo, danificando-se severamente. A asa esquerda tocou o terreno, sofrendo danos no bordo de ataque. A aeronave veio a parar aproximadamente 50 metros da lateral esquerda da pista.

O piloto conseguiu evacuar a aeronave sem auxílio, não sofrendo lesões significativas. Não houve princípio de incêndio. O produto agrícola contido nos tanques da aeronave foi contido e posteriormente recolhido por equipe especializada.`,
          isCompleted: true,
        },
        {
          id: "sub-2-2",
          title: "Comunicações Relevantes",
          order: 2,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-2-3",
          title: "Últimos momentos antes da ocorrência",
          order: 3,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-2-4",
          title: "Testemunhos e evidências",
          order: 4,
          content: "",
          isCompleted: true,
        },
      ],
    },
    {
      id: "sec-3",
      title: "Análise Técnica",
      order: 3,
      content: "",
      isCompleted: false,
      subsections: [
        {
          id: "sub-3-1",
          title: "Fatores contribuintes identificados",
          order: 1,
          content: `O piloto relatou estar em boas condições físicas e psicológicas no momento da ocorrência. Havia dormido aproximadamente 7 horas na noite anterior e estava no terceiro voo do dia.

A análise da carga de trabalho indica que o piloto estava operando dentro dos limites de fadiga estabelecidos pela regulamentação. Não foram identificados fatores como estresse, pressão externa ou uso de substâncias que pudessem afetar o desempenho.`,
          isCompleted: true,
        },
        {
          id: "sub-3-2",
          title: "Análise de sistemas e componentes",
          order: 2,
          content: `Não foram identificadas evidências de falhas mecânicas ou estruturais que pudessem ter contribuído para a ocorrência. O sistema de controle de voo estava operacional, conforme verificado nos destroços.

O trem de pouso apresentava manutenção em dia, com última inspeção realizada há 30 horas de voo. Não havia discrepâncias registradas nos livros de bordo da aeronave.`,
          isCompleted: true,
        },
        {
          id: "sub-3-3",
          title: "Avaliação de procedimentos",
          order: 3,
          content: `A análise do aspecto operacional identificou que o piloto possuía experiência significativa em operações aeroagrícolas, com mais de 3.000 horas no tipo da aeronave. A documentação do piloto estava regular, incluindo CMA válido e habilitação PAGA (Piloto Agrícola).

A operação estava sendo conduzida dentro dos parâmetros estabelecidos pela regulamentação vigente (RBAC 137). A aeronave estava dentro dos limites de peso e balanceamento previstos no manual do fabricante.` ,
          isCompleted: true,
        },
        {
          id: "sub-3-4",
          title: "Análise de fatores humanos",
          order: 4,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-3-5",
          title: "Condições operacionais",
          order: 5,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-3-6",
          title: "Aspectos organizacionais",
          order: 6,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-3-7",
          title: "Aspectos Ambientais",
          order: 7,
          content: `Fios de energia, Cercas, Torres, Árvores isoladas`,
          isCompleted: false,
        },
      ],
    },
    {
      id: "sec-4",
      title: "Conclusões",
      order: 4,
      content: "",
      isCompleted: false,
      subsections: [
        {
          id: "sub-4-1",
          title: "Causas identificadas",
          order: 1,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-4-2",
          title: "Relação causal entre fatores",
          order: 2,
          content: `Infraestrutura Aeroportuária: Condições inadequadas da pista de operação, com irregularidades na superfície.



Julgamento do Piloto: Possível subestimação das condições da pista antes da decolagem.



Supervisão Gerencial: Ausência de inspeção formal das condições da pista antes do início das operações.`,
          isCompleted: true,
        },
        {
          id: "sub-4-3",
          title: "Síntese da investigação",
          order: 3,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-4-4",
          title: "Aspectos críticos de segurança",
          order: 4,
          content: `Diante das evidências coletadas e da análise realizada, conclui-se preliminarmente que a ocorrência foi caracterizada como , resultante de perda de controle direcional durante a corrida de decolagem (LOC-G).

A perda de controle foi precipitada pela interação da aeronave com irregularidades na superfície da pista de operação, que não foram adequadamente avaliadas antes do início da operação de voo.

Os fatores contribuintes identificados relacionam-se principalmente às condições da infraestrutura de solo e ao processo de gerenciamento de risco da operação.

Recomendações de segurança serão emitidas em relatório final, visando prevenir ocorrências similares.`,
          isCompleted: true,
        },
      ],
    },
    {
      id: "sec-5",
      title: "Recomendações de Segurança",
      order: 5,
      content: "",
      isCompleted: false,
      subsections: [
        {
          id: "sub-5-1",
          title: "Medidas preventivas propostas",
          order: 1,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-5-2",
          title: "Destinatários das recomendações",
          order: 2,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-5-3",
          title: "Priorização de ações",
          order: 3,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-5-5",
          title: "Outras recomendações",
          order: 5,
          content: "",
          isCompleted: false,
        },
      ],
    },
    {
      id: "sec-6",
      title: "Ações Corretivas/Preventivas",
      order: 6,
      content: "asdfasdfasdf",
      isCompleted: false,
      subsections: [
        {
          id: "sub-6-1",
          title: "Ações imediatas tomadas",
          order: 1,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-2",
          title: "Medidas de curto prazo",
          order: 2,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-3",
          title: "Iniciativas de médio/longo prazo",
          order: 3,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-4",
          title: "Responsáveis pela implementação",
          order: 4,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-5",
          title: "Cronograma de execução",
          order: 5,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-6",
          title: "Indicadores de acompanhamento",
          order: 6,
          content: "",
          isCompleted: false,
        },
      ],
    },
  ],
  createdAt: new Date("2025-06-15T10:00:00Z"),
  updatedAt: new Date("2025-06-20T14:30:00Z"),
  createdBy: "1",
  lastEditedBy: "1",
  progress: {
    total: 32,
    completed: 14,
  },
};

export const mockAIMessages: AIMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content: `Claro! Analisei o texto da seção 2.1 e identifiquei algumas áreas que podem ser aprimoradas:

1. **Terminologia técnica**: Usar termos mais precisos conforme NSCA 3-13
2. **Estrutura**: Reorganizar em ordem cronológica
3. **Fatores humanos**: Incluir análise SHELL/HFACS

Posso reescrever o texto aplicando essas melhorias?`,
    timestamp: new Date("2025-06-20T14:25:00Z"),
    sources: ["NSCA 3-13", "Manual HFACS", "Anexo 13 ICAO"],
  },
];

export const mockQuickActions: AIQuickAction[] = [
  {
    id: "qa-1",
    label: "Melhorar Texto",
    icon: "Sparkles",
    prompt: "Melhore o texto selecionado mantendo a linguagem técnica SIPAER",
  },
  {
    id: "qa-2",
    label: "Traduzir",
    icon: "Globe",
    prompt: "Traduza o texto selecionado para inglês técnico aeronáutico",
  },
  {
    id: "qa-3",
    label: "Sugerir Fatores",
    icon: "Lightbulb",
    prompt: "Sugira fatores contribuintes baseado nos dados da ocorrência",
  },
  {
    id: "qa-4",
    label: "Gerar Template",
    icon: "FileText",
    prompt: "Gere um template para esta seção baseado em casos similares",
  },
];

export const mockSuggestedPrompts = [
  "Tornar mais claro e técnico",
  "Para inglês (ICAO)",
];
