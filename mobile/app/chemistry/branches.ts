export type ChemistryBranchId =
  | "all"
  | "general"
  | "inorganic"
  | "organic"
  | "physical"
  | "analytical"
  | "biochemistry"
  | "polymers"
  | "electrochemistry";

export type ChemistryBranchDef = {
  id: ChemistryBranchId;
  labelRu: string;
  labelEn: string;
  aliases: string[];
};

export const CHEMISTRY_BRANCHES: ChemistryBranchDef[] = [
  { id: "all", labelRu: "Все разделы", labelEn: "All branches", aliases: [] },
  { id: "general", labelRu: "Общая", labelEn: "General", aliases: ["general", "общая"] },
  { id: "inorganic", labelRu: "Неорганическая", labelEn: "Inorganic", aliases: ["inorganic", "неорганическая", "неорг"] },
  { id: "organic", labelRu: "Органическая", labelEn: "Organic", aliases: ["organic", "органическая", "орг"] },
  {
    id: "physical",
    labelRu: "Физическая",
    labelEn: "Physical",
    aliases: ["physical", "physical_chemistry", "физическая", "физхим", "general", "inorganic"],
  },
  {
    id: "analytical",
    labelRu: "Аналитическая",
    labelEn: "Analytical",
    aliases: ["analytical", "аналитическая", "analysis", "inorganic", "general"],
  },
  {
    id: "biochemistry",
    labelRu: "Биохимия",
    labelEn: "Biochemistry",
    aliases: ["biochemistry", "биохимия", "bio"],
  },
  {
    id: "polymers",
    labelRu: "Полимеры",
    labelEn: "Polymers",
    aliases: ["polymers", "polymer", "полимеры", "organic"],
  },
  {
    id: "electrochemistry",
    labelRu: "Электрохимия",
    labelEn: "Electrochemistry",
    aliases: ["electrochemistry", "electrochem", "electro", "электрохимия", "physical", "inorganic"],
  },
];

const branchById = new Map(CHEMISTRY_BRANCHES.map((b) => [b.id, b]));

function low(s: string): string {
  return s.trim().toLowerCase();
}

export function normalizeChemistryBranch(input?: string | null): ChemistryBranchId | null {
  const raw = low(String(input ?? ""));
  if (!raw) return null;

  for (const b of CHEMISTRY_BRANCHES) {
    if (b.id === raw) return b.id;
    if (b.aliases.map(low).includes(raw)) return b.id;
  }

  return null;
}

export function getBranchAliases(branch?: string | null): string[] {
  const id = normalizeChemistryBranch(branch);
  if (!id || id === "all") return [];
  const def = branchById.get(id);
  if (!def) return [];
  const set = new Set<string>([id, ...def.aliases.map(low)]);
  return Array.from(set);
}

export function getBranchLabel(branch: string | null | undefined, lang: "ru" | "en"): string {
  const id = normalizeChemistryBranch(branch) ?? "all";
  const def = branchById.get(id);
  if (!def) return lang === "ru" ? "Все разделы" : "All branches";
  return lang === "ru" ? def.labelRu : def.labelEn;
}

export function inferChemistryBranchFromText(input: string): ChemistryBranchId | null {
  const t = low(input);
  if (!t) return null;

  if (/(электро|electro)/.test(t)) return "electrochemistry";
  if (/(полимер|polymer)/.test(t)) return "polymers";
  if (/(биохим|biochem|фермент|enzyme)/.test(t)) return "biochemistry";
  if (/(аналит|titr|хромат|analysis)/.test(t)) return "analytical";
  if (/(физическ|термодин|кинетик|thermo|kinetic|equilibrium)/.test(t)) return "physical";
  if (/(органич|алкан|алкен|алкин|benz|organic)/.test(t)) return "organic";
  if (/(неорганич|соль|оксид|кислот|основан|inorganic)/.test(t)) return "inorganic";
  return "general";
}

