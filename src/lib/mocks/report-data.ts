import type {
  Report,
  User,
  AIMessage,
  AIQuickAction,
} from "@/types/report";

export const mockUser: User = {
  id: "1",
  name: "João Silva",
  email: "jhorifelix@hotmail.com",
  role: "investigator",
  unit: "SERIPA II",
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
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-1-3",
          title: "Tipo de ocorrência",
          order: 3,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-1-4",
          title: "Aeronave(s) envolvida(s)",
          order: 4,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-1-5",
          title: "Condições meteorológicas",
          order: 5,
          content: "",
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
          title: "Antecedentes",
          order: 1,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-2-2",
          title: "Planejamento do voo",
          order: 2,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-2-3",
          title: "Experiência do piloto",
          order: 3,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-2-4",
          title: "Descrição do voo",
          order: 4,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-2-5",
          title: "Informações de testemunhas",
          order: 5,
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
          title: "Fator humano",
          order: 1,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-3-2",
          title: "Fator material",
          order: 2,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-3-3",
          title: "Fator operacional",
          order: 3,
          content: "",
          isCompleted: true,
        },
        {
          id: "sub-3-4",
          title: "Aspectos organizacionais",
          order: 4,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-3-5",
          title: "Análise SHELL/HFACS",
          order: 5,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-3-6",
          title: "Cadeia de eventos",
          order: 6,
          content: "",
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
          title: "Fatos",
          order: 1,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-4-2",
          title: "Fatores contribuintes",
          order: 2,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-4-3",
          title: "Fatores condicionantes",
          order: 3,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-4-4",
          title: "Causa provável",
          order: 4,
          content: "",
          isCompleted: false,
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
          title: "Recomendações ao operador",
          order: 1,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-5-2",
          title: "Recomendações à ANAC",
          order: 2,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-5-3",
          title: "Recomendações ao fabricante",
          order: 3,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-5-4",
          title: "Recomendações a entidades",
          order: 4,
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
      content: "",
      isCompleted: false,
      subsections: [
        {
          id: "sub-6-1",
          title: "Ações já implementadas",
          order: 1,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-2",
          title: "Ações em andamento",
          order: 2,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-3",
          title: "Ações planejadas",
          order: 3,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-4",
          title: "Acompanhamento",
          order: 4,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-5",
          title: "Eficácia das ações",
          order: 5,
          content: "",
          isCompleted: false,
        },
        {
          id: "sub-6-6",
          title: "Lições aprendidas",
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
