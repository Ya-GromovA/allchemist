import { getBranchAliases } from "@app/chemistry/branches";
import { execSql } from "./database";

export type Atom = { element: string; x: number; y: number; z?: number };

export type Molecule = {
  id: string;
  lang: "ru" | "en";
  branch?: string | null;
  name: string;
  nameRu?: string;
  nameEn?: string;
  formula: string;
  atoms: Atom[];
};

export type Reaction = {
  id: string;
  lang: "ru" | "en";
  branch?: string | null;
  title: string;
  equation: string;
  conditions?: string | null;
  reactants: any[];
  products: any[];
  data?: Record<string, any>;
};

function safeParseJson(s: any, fallback: any) {
  try {
    if (typeof s !== "string") return fallback;
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

function hasCyrillic(text: string): boolean {
  return /[А-Яа-яЁё]/.test(text);
}

function stripEnglishTail(name: string): string {
  return String(name ?? "")
    .replace(/\s*\(([A-Za-z0-9 ,.'\-]+)\)\s*$/g, "")
    .trim();
}

function pickRuName(id: string, formula: string, rowName: string, data: any): string {
  const nameRu = String(data?.name_ru ?? data?.ru_name ?? data?.title_ru ?? "").trim();
  if (nameRu) return stripEnglishTail(nameRu);

  const direct = String(rowName ?? "").trim();
  if (direct && hasCyrillic(direct)) return stripEnglishTail(direct);
  if (direct) return `Молекула ${direct}`;

  if (formula) return `Молекула ${formula}`;
  return `Молекула ${id}`;
}

function branchFilterSql(branch?: string): { sql: string; params: string[] } {
  const aliases = getBranchAliases(branch);
  if (!aliases.length) return { sql: "", params: [] };

  const placeholders = aliases.map(() => "?").join(", ");
  return {
    sql: `
      AND (
        lower(coalesce(branch, '')) IN (${placeholders})
        OR lower(coalesce(json_extract(data_json, '$.branch'), '')) IN (${placeholders})
        OR lower(coalesce(json_extract(data_json, '$.category'), '')) IN (${placeholders})
      )
    `,
    params: [...aliases, ...aliases, ...aliases],
  };
}

export async function getAllMolecules(lang: "ru" | "en", branch?: string): Promise<Molecule[]> {
  const bf = branchFilterSql(branch);
  const rows = await execSql(
    `SELECT id, lang, branch, name, formula, data_json
     FROM molecules
     WHERE (lang = ? OR lang IS NULL OR lang = '')
     ${bf.sql}
     ORDER BY name ASC;`,
    [lang, ...bf.params]
  );

  return (rows ?? []).map((r: any) => {
    const data = safeParseJson(r.data_json, {});
    const atoms0 = Array.isArray(data?.atoms) ? data.atoms : [];
    const id = String(r.id);
    const formula = String(r.formula ?? data?.formula ?? "");
    const rowName = String(r.name ?? data?.name ?? "");
    const nameRu = String(data?.name_ru ?? data?.ru_name ?? data?.title_ru ?? "").trim();
    const nameEn = String(data?.name_en ?? data?.en_name ?? data?.title_en ?? "").trim();

    const finalName = lang === "ru" ? pickRuName(id, formula, rowName, data) : (nameEn || rowName || id);

    return {
      id,
      lang: (String(r.lang) as any) || "ru",
      branch: (r.branch ?? data?.branch ?? data?.category ?? null) as string | null,
      name: finalName,
      nameRu,
      nameEn,
      formula,
      atoms: atoms0.map((a: any) => ({ element: a.element ?? a.el ?? "", x: a.x ?? 0, y: a.y ?? 0, z: a.z })),
    };
  });
}

export async function getAllReactions(lang: "ru" | "en", branch?: string): Promise<Reaction[]> {
  const bf = branchFilterSql(branch);
  const rows = await execSql(
    `SELECT id, lang, branch, title, equation, conditions, data_json
     FROM reactions
     WHERE (lang = ? OR lang IS NULL OR lang = '')
     ${bf.sql}
     ORDER BY title ASC;`,
    [lang, ...bf.params]
  );

  return (rows ?? []).map((r: any) => {
    const data = safeParseJson(r.data_json, {});
    return {
      id: String(r.id),
      lang: (String(r.lang) as any) || "ru",
      branch: (r.branch ?? data?.branch ?? data?.category ?? null) as string | null,
      title: String(r.title ?? data?.title ?? ""),
      equation: String(r.equation ?? data?.equation ?? ""),
      conditions: r.conditions ?? data?.conditions ?? null,
      reactants: Array.isArray(data?.reactants) ? data.reactants : [],
      products: Array.isArray(data?.products) ? data.products : [],
      data,
    };
  });
}
