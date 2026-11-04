// Listas institucionais compartilhadas (perfil do usuário e gestão de usuários).

export interface Option {
  value: string;
  label: string;
}

export const UNIT_OPTIONS: Option[] = [
  { value: "CENIPA", label: "CENIPA" },
  { value: "SERIPA I", label: "SERIPA I — Belém" },
  { value: "SERIPA II", label: "SERIPA II — Recife" },
  { value: "SERIPA III", label: "SERIPA III — Rio de Janeiro" },
  { value: "SERIPA IV", label: "SERIPA IV — São Paulo" },
  { value: "SERIPA V", label: "SERIPA V — Canoas" },
  { value: "SERIPA VI", label: "SERIPA VI — Brasília" },
  { value: "SERIPA VII", label: "SERIPA VII — Manaus" },
];

// Hierarquia de postos e graduações da Força Aérea Brasileira.
export const POSTO_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "Oficiais-Generais",
    options: ["Tenente-Brigadeiro do Ar", "Major-Brigadeiro do Ar", "Brigadeiro do Ar"],
  },
  {
    label: "Oficiais Superiores",
    options: ["Coronel", "Tenente-Coronel", "Major"],
  },
  {
    label: "Oficial Intermediário",
    options: ["Capitão"],
  },
  {
    label: "Oficiais Subalternos",
    options: ["Primeiro-Tenente", "Segundo-Tenente"],
  },
  {
    label: "Praças Especiais",
    options: ["Aspirante a Oficial", "Cadete"],
  },
  {
    label: "Graduados",
    options: [
      "Suboficial",
      "Primeiro-Sargento",
      "Segundo-Sargento",
      "Terceiro-Sargento",
      "Cabo",
      "Taifeiro-Mor",
    ],
  },
  {
    label: "Praças",
    options: [
      "Soldado de Primeira Classe",
      "Soldado de Segunda Classe",
      "Taifeiro de Primeira Classe",
      "Taifeiro de Segunda Classe",
    ],
  },
  {
    label: "Civil",
    options: ["Civil"],
  },
];

export const POSTO_OPTIONS: string[] = POSTO_GROUPS.flatMap((g) => g.options);
