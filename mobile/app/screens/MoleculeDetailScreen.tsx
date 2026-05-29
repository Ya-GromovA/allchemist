import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Switch, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@app/navigation/RootNavigator";
import { execSql } from "@app/db/database";
import { MOLECULE_FACTS_BY_FORMULA } from "@app/chemistry/moleculeFacts";

import Molecule3DView, { Molecule3DData } from "@app/components/Molecule3DView";
import Molecule2DView from "@app/components/Molecule2DView";

type Props = NativeStackScreenProps<RootStackParamList, "MoleculeDetails">;

type MoleculeRow = {
  id: string;
  name: string;
  formula: string;
  branch?: string | null;
  data_json: string | null;
};

type ReactionRow = {
  id: string;
  title: string;
  equation: string;
  conditions: string | null;
  data_json: string | null;
};

type MoleculeInfo = {
  description?: string;
  uses?: string[];
  reactsWith?: string[];
  incompatibleWith?: string[];
};

function hasCyrillic(text: string): boolean {
  return /[А-Яа-яЁё]/.test(text);
}

function stripEnglishTail(name: string): string {
  return String(name ?? "")
    .replace(/\s*\(([A-Za-z0-9 ,.'\-]+)\)\s*$/g, "")
    .trim();
}

function asStringArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).map((x) => x.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

function makeRuName(id: string, formula: string, rowName: string, data: any): string {
  const fromRu = String(data?.name_ru ?? data?.ru_name ?? data?.title_ru ?? "").trim();
  if (fromRu) return stripEnglishTail(fromRu);
  const base = String(rowName ?? data?.name ?? "").trim();
  if (base && hasCyrillic(base)) return stripEnglishTail(base);
  if (base) return `Молекула ${base}`;
  return formula ? `Молекула ${formula}` : `Молекула ${id}`;
}

function inferredClass(formula: string): string {
  const f = formula.toUpperCase();
  if (f === "H2O") return "оксид водорода";
  if (/^H[A-Z0-9]/.test(f) && /O/.test(f)) return "кислота";
  if (f.includes("OH")) return "основание";
  if (/[A-Z][a-z]?\d*[A-Z][a-z]?/.test(f) && /O/.test(f)) return "неорганическое соединение";
  if (/C\d*H\d*/.test(f)) return "органическое соединение";
  return "химическое соединение";
}

function reactionOutcomeHint(eq: string): string {
  const text = String(eq ?? "");
  const right = text.includes("->") ? text.split("->")[1] : text.includes("→") ? text.split("→")[1] : "";
  const products = right.trim();
  if (!products) return "возможна химическая реакция с образованием новых продуктов";
  return `по уравнению образуются продукты: ${products}`;
}

function parseFormulaCounts(formula: string): Record<string, number> {
  const out: Record<string, number> = {};
  const src = String(formula ?? "").trim();
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const el = m[1];
    const n = Number(m[2] || "1");
    out[el] = (out[el] ?? 0) + (Number.isFinite(n) ? n : 1);
  }
  return out;
}

function calcMolarMass(formula: string): number | null {
  const mass: Record<string, number> = {
    H: 1.008,
    C: 12.011,
    N: 14.007,
    O: 15.999,
    F: 18.998,
    Na: 22.99,
    Mg: 24.305,
    Al: 26.982,
    Si: 28.085,
    P: 30.974,
    S: 32.06,
    Cl: 35.45,
    K: 39.098,
    Ca: 40.078,
    Fe: 55.845,
    Cu: 63.546,
    Zn: 65.38,
    Br: 79.904,
    I: 126.9,
  };
  const c = parseFormulaCounts(formula);
  const keys = Object.keys(c);
  if (!keys.length) return null;
  let total = 0;
  for (const k of keys) {
    if (!(k in mass)) return null;
    total += mass[k] * c[k];
  }
  return total;
}

function parseMolecule(row: MoleculeRow): { mol: Molecule3DData; info: MoleculeInfo; branch: string | null } {
  const data = row.data_json ? JSON.parse(row.data_json) : {};
  const formula = String(row.formula || data?.formula || "");
  const name = makeRuName(String(row.id), formula, String(row.name ?? ""), data);
  const info: MoleculeInfo = {
    description: String(data?.description_ru ?? data?.description ?? "").trim() || undefined,
    uses: asStringArray(data?.uses_ru ?? data?.uses ?? data?.applications),
    reactsWith: asStringArray(data?.reacts_with),
    incompatibleWith: asStringArray(data?.incompatible_with ?? data?.do_not_mix_with),
  };

  return {
    mol: {
      id: row.id,
      name,
      formula,
      atoms: Array.isArray(data?.atoms) ? data.atoms : [],
    },
    info,
    branch: (row.branch ?? data?.branch ?? data?.category ?? null) as string | null,
  };
}

function extractPartners(eqSide: any[], selfFormula: string): string[] {
  const out = new Set<string>();
  for (const x of Array.isArray(eqSide) ? eqSide : []) {
    const f = String(x?.formula ?? "").trim();
    if (!f) continue;
    if (f.toLowerCase() === selfFormula.toLowerCase()) continue;
    out.add(f);
  }
  return Array.from(out);
}

export default function MoleculeDetailScreen({ route }: Props) {
  const { moleculeId } = route.params;
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<MoleculeRow | null>(null);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [view3d, setView3d] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await execSql(
          `SELECT id, name, formula, branch, data_json FROM molecules WHERE id=? LIMIT 1;`,
          [moleculeId]
        );
        const found = (res?.[0] as any) ?? null;
        setRow(found);

        if (found?.formula) {
          const formula = String(found.formula);
          const rr = await execSql(
            `SELECT id, title, equation, conditions, data_json
             FROM reactions
             WHERE equation LIKE ? OR lower(coalesce(data_json, '')) LIKE lower(?)
             ORDER BY title ASC
             LIMIT 120;`,
            [`%${formula}%`, `%${formula}%`]
          );
          setReactions((rr ?? []) as any);
        } else {
          setReactions([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [moleculeId]);

  const parsed = useMemo(() => {
    if (!row) return null;
    try {
      return parseMolecule(row);
    } catch {
      return {
        mol: { id: row.id, name: row.name || row.id, formula: row.formula || "", atoms: [] },
        info: {},
        branch: null,
      };
    }
  }, [row]);

  const mol = parsed?.mol ?? null;
  const extraInfo = parsed?.info ?? {};

  const atomStats = useMemo(() => {
    if (!mol) return [] as Array<{ el: string; count: number }>;
    const map = new Map<string, number>();
    for (const atom of mol.atoms) {
      const el = String((atom as any)?.el ?? (atom as any)?.element ?? "").trim() || "X";
      map.set(el, (map.get(el) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([el, count]) => ({ el, count }))
      .sort((a, b) => a.el.localeCompare(b.el));
  }, [mol]);

  const molarMass = useMemo(() => (mol?.formula ? calcMolarMass(mol.formula) : null), [mol?.formula]);

  const reactionInfo = useMemo(() => {
    const currentFormula = String(mol?.formula ?? "").trim();
    if (!currentFormula) {
      return {
        reactsWith: [] as string[],
        conditions: [] as string[],
        incompatibleDetailed: [] as string[],
      };
    }

    const reacts = new Set<string>();
    const conds = new Set<string>();
    const incompatibleDetailed = new Set<string>();

    for (const r of reactions) {
      const data = r.data_json ? JSON.parse(r.data_json) : {};
      const reactants = Array.isArray(data?.reactants) ? data.reactants : [];
      const products = Array.isArray(data?.products) ? data.products : [];

      const inReactants = reactants.some((x: any) => String(x?.formula ?? "").toLowerCase() === currentFormula.toLowerCase());
      const inProducts = products.some((x: any) => String(x?.formula ?? "").toLowerCase() === currentFormula.toLowerCase());

      if (inReactants) {
        const partners = extractPartners(reactants, currentFormula);
        for (const f of partners) {
          reacts.add(f);
          incompatibleDetailed.add(`${f}: ${reactionOutcomeHint(r.equation)}`);
        }
      }
      if (inProducts || inReactants) {
        if (r.conditions) conds.add(String(r.conditions));
      }
    }

    return {
      reactsWith: Array.from(reacts).sort((a, b) => a.localeCompare(b)),
      conditions: Array.from(conds).slice(0, 6),
      incompatibleDetailed: Array.from(incompatibleDetailed).slice(0, 12),
    };
  }, [reactions, mol?.formula]);

  const facts = useMemo(() => {
    const f = String(mol?.formula ?? "").trim();
    return MOLECULE_FACTS_BY_FORMULA[f] ?? null;
  }, [mol?.formula]);

  const generatedDescription = useMemo(() => {
    if (!mol) return "";
    const klass = inferredClass(String(mol.formula ?? ""));
    const atomsText = atomStats.length ? atomStats.map((x) => `${x.el}${x.count > 1 ? x.count : ""}`).join(" ") : "не определен";
    return `${mol.formula || mol.id} — ${klass}. Состав по атомам: ${atomsText}.`;
  }, [mol, atomStats]);

  const generatedUses = useMemo(() => {
    const list: string[] = [];
    if (reactionInfo.reactsWith.length > 0) list.push("реагент в химических реакциях");
    if (molarMass) list.push("расчеты стехиометрии и молярной массы");
    if (!list.length) list.push("данные о прикладном применении не указаны в базе");
    return list;
  }, [reactionInfo.reactsWith.length, molarMass]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.hint}>Загрузка молекулы…</Text>
      </View>
    );
  }

  if (!row || !mol) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Молекула не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingBottom: 28 }}>
      <Text style={styles.title}>{mol.name || mol.id}</Text>
      <Text style={styles.sub}>{mol.formula}</Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>2D</Text>
        <Switch value={view3d} onValueChange={setView3d} />
        <Text style={styles.switchLabel}>3D</Text>
      </View>

      {!view3d ? (
        <Molecule2DView molecule={{ atoms: mol.atoms, formula: mol.formula }} height={380} />
      ) : (
        <Molecule3DView molecule={mol} height={380} showGestureHint={false} />
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Информация о молекуле</Text>
        <Text style={styles.cardText}>Русское название: {mol.name || "—"}</Text>
        <Text style={styles.cardText}>Формула: {mol.formula || "—"}</Text>
        <Text style={styles.cardText}>Количество атомов: {mol.atoms.length}</Text>
        <Text style={styles.cardText}>Состав: {atomStats.length ? atomStats.map((x) => `${x.el}${x.count > 1 ? x.count : ""}`).join(" ") : "—"}</Text>
        <Text style={styles.cardText}>Молярная масса: {molarMass ? `${molarMass.toFixed(3)} г/моль` : "нет данных"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Что это за вещество</Text>
        <Text style={styles.cardTextSecondary}>
          {extraInfo.description || facts?.description || generatedDescription}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Где применяется</Text>
        <Text style={styles.cardTextSecondary}>
          {extraInfo.uses && extraInfo.uses.length
            ? extraInfo.uses.join("; ")
            : facts?.uses?.length
              ? facts.uses.join("; ")
              : generatedUses.join("; ")}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>С чем реагирует</Text>
        <Text style={styles.cardTextSecondary}>
          {extraInfo.reactsWith && extraInfo.reactsWith.length
            ? extraInfo.reactsWith.join(", ")
            : facts?.reactsWith?.length
              ? facts.reactsWith.join(", ")
            : reactionInfo.reactsWith.length
              ? reactionInfo.reactsWith.join(", ")
              : "В базе нет подтвержденных данных по реакциям для этой молекулы."}
        </Text>
        {reactionInfo.conditions.length > 0 && (
          <Text style={styles.cardTextSecondary}>Условия: {reactionInfo.conditions.join("; ")}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>С чем нельзя смешивать</Text>
        <Text style={styles.cardTextSecondary}>
          {extraInfo.incompatibleWith && extraInfo.incompatibleWith.length
            ? extraInfo.incompatibleWith.join(", ")
            : facts?.incompatibleWith?.length
              ? facts.incompatibleWith.join(", ")
            : reactionInfo.incompatibleDetailed.length
              ? "По уравнениям реакций в базе вещество вступает в реакцию с указанными веществами, поэтому смешивание без контроля может привести к образованию новых продуктов."
              : "В базе нет отдельного списка несовместимых веществ."}
        </Text>
        {reactionInfo.incompatibleDetailed.map((x) => (
          <Text key={x} style={styles.cardTextSecondary}>- {x}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Источники</Text>
        <Text style={styles.cardTextSecondary}>
          {facts?.source?.length ? facts.source.join("; ") : "Справочные источники для этой молекулы не добавлены."}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050816" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050816" },
  hint: { marginTop: 10, color: "#9ca3af", textAlign: "center" },

  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "900" },
  sub: { color: "#cbd5e1", marginTop: 6 },

  switchRow: { marginTop: 10, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { color: "#9ca3af" },

  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 12,
  },
  sectionTitle: { color: "#e5e7eb", fontWeight: "900", marginBottom: 8 },
  cardText: { color: "#e5e7eb", fontWeight: "800", marginBottom: 4 },
  cardTextSecondary: { marginTop: 4, color: "#9ca3af", lineHeight: 18 },
});
