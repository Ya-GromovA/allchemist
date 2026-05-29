import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Switch, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getBranchLabel } from "@app/chemistry/branches";
import { RootStackParamList } from "@app/navigation/RootNavigator";
import { useI18n } from "@app/i18n";
import { getAllMolecules, Molecule } from "@app/db/chemistryRepository";

import Molecule3DView, { Molecule3DData } from "@app/components/Molecule3DView";
import Molecule2DView from "@app/components/Molecule2DView";

type Props = NativeStackScreenProps<RootStackParamList, "MoleculesGallery">;

const ELEMENT_NAMES: Record<string, { ru: string; en: string }> = {
  H: { ru: "Водород", en: "Hydrogen" },
  C: { ru: "Углерод", en: "Carbon" },
  O: { ru: "Кислород", en: "Oxygen" },
  N: { ru: "Азот", en: "Nitrogen" },
  S: { ru: "Сера", en: "Sulfur" },
  P: { ru: "Фосфор", en: "Phosphorus" },
  Cl: { ru: "Хлор", en: "Chlorine" },
  F: { ru: "Фтор", en: "Fluorine" },
  Br: { ru: "Бром", en: "Bromine" },
  I: { ru: "Йод", en: "Iodine" },
  Na: { ru: "Натрий", en: "Sodium" },
  K: { ru: "Калий", en: "Potassium" },
  Ca: { ru: "Кальций", en: "Calcium" },
  Mg: { ru: "Магний", en: "Magnesium" },
  Fe: { ru: "Железо", en: "Iron" },
  Cu: { ru: "Медь", en: "Copper" },
  Zn: { ru: "Цинк", en: "Zinc" },
  Al: { ru: "Алюминий", en: "Aluminium" },
  Si: { ru: "Кремний", en: "Silicon" },
};

const MOLECULE_NAME_RU: Record<string, string> = {
  "(+-)adrenaline": "Адреналин",
  adrenaline: "Адреналин",
  adrenalin: "Адреналин",
  ethanol: "Этанол",
  acetone: "Ацетон",
  ethanolamine: "Этаноламин",
  "acetone cyanohydrin": "Циангидрин ацетона",
  "d-glucose": "Глюкоза",
  "d-glucose, 5-thio-": "5-тио-D-глюкоза",
  "glucose 6-phosphate": "Глюкозо-6-фосфат",
  water: "Вода",
  methane: "Метан",
  ammonia: "Аммиак",
  oxygen: "Кислород",
  hydrogen: "Водород",
  "carbon dioxide": "Углекислый газ",
  "sulfuric acid": "Серная кислота",
  "hydrochloric acid": "Соляная кислота",
  "sodium chloride": "Хлорид натрия",
};

function moleculeDisplayName(name: string | undefined, lang: "ru" | "en", fallbackId?: string): string {
  const value = String(name ?? "").trim();
  if (!value) return fallbackId || "Молекула";
  if (lang !== "ru") return value;
  const key = value.toLowerCase();
  return MOLECULE_NAME_RU[key] || value;
}

function to3D(m: Molecule, lang: "ru" | "en"): Molecule3DData {
  return {
    id: m.id,
    name: moleculeDisplayName(m.name, lang, m.id),
    formula: m.formula,
    atoms: m.atoms.map((a) => ({ el: String(a.element ?? "C"), x: Number(a.x ?? 0), y: Number(a.y ?? 0), z: Number(a.z ?? 0) })),
  };
}

export default function MoleculesGalleryScreen({ navigation, route }: Props) {
  const { lang } = useI18n();
  const branch = route.params?.branch;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Molecule[]>([]);
  const [selected, setSelected] = useState<Molecule | null>(null);
  const [view3d, setView3d] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await getAllMolecules(lang, branch);
        setRows(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [lang, branch]);

  const selectedMol = useMemo(() => (selected ? to3D(selected, lang) : null), [selected, lang]);
  const branchLabel = getBranchLabel(branch, lang);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => {
      const hay = `${m.name || ""} ${m.formula || ""} ${m.id || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const atomLegend = useMemo(() => {
    const set = new Set<string>();
    for (const a of selectedMol?.atoms ?? []) set.add(String(a.el || "").trim());
    return Array.from(set).filter(Boolean).sort();
  }, [selectedMol]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{lang === "ru" ? "Молекулы" : "Molecules"}</Text>
        {!!branch && <Text style={styles.branchHint}>{lang === "ru" ? `Раздел: ${branchLabel}` : `Branch: ${branchLabel}`}</Text>}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>2D</Text>
          <Switch value={view3d} onValueChange={setView3d} />
          <Text style={styles.switchLabel}>3D</Text>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={lang === "ru" ? "Поиск по названию или формуле" : "Search by name or formula"}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.trim().length > 0 && (
            <Pressable onPress={() => setQuery("")} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>x</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>{lang === "ru" ? "Загрузка молекул…" : "Loading molecules…"}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item)} style={styles.card}>
              <Text style={styles.cardTitle}>{moleculeDisplayName(item.name, lang, item.id)}</Text>
              <Text style={styles.cardSub}>{item.formula}</Text>
              {!!item.branch && <Text style={styles.cardTag}>{getBranchLabel(item.branch, lang)}</Text>}
              <Text style={styles.cardHint}>{lang === "ru" ? "Нажми для просмотра" : "Tap to open"}</Text>
            </Pressable>
          )}
           ListEmptyComponent={<Text style={styles.hint}>{lang === "ru" ? "Ничего не найдено" : "No molecules found"}</Text>}
         />
       )}

      {selected && (
        <View style={styles.drawer}>
          <View style={styles.drawerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.drawerTitle}>{moleculeDisplayName(selected.name, lang, selected.id)}</Text>
              <Text style={styles.drawerSub}>{selected.formula}</Text>
            </View>

            <Pressable onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>x</Text>
            </Pressable>
          </View>

          {!view3d ? (
            selectedMol ? <Molecule2DView molecule={{ atoms: selectedMol.atoms, formula: selectedMol.formula }} height={320} /> : null
          ) : (
            selectedMol && <Molecule3DView molecule={selectedMol} height={320} />
          )}

          {atomLegend.length > 0 && (
            <View style={styles.legendWrap}>
              <Text style={styles.legendTitle}>{lang === "ru" ? "Атомы в молекуле" : "Atoms in molecule"}</Text>
              <View style={styles.legendRow}>
                {atomLegend.map((el) => {
                  const item = ELEMENT_NAMES[el];
                  const name = item ? (lang === "ru" ? item.ru : item.en) : (lang === "ru" ? "Элемент" : "Element");
                  return (
                    <View key={el} style={styles.legendChip}>
                      <Text style={styles.legendChipText}>{el} - {name}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <Pressable
            style={styles.openBtn}
            onPress={() => {
              navigation.navigate("MoleculeDetails", { moleculeId: selected.id });
              setSelected(null);
            }}
          >
            <Text style={styles.openBtnText}>{lang === "ru" ? "Открыть карточку" : "Open details"}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050816" },
  header: { paddingTop: 18, paddingHorizontal: 14, paddingBottom: 10 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "800" },
  branchHint: { marginTop: 4, color: "#9ca3af", fontSize: 12 },
  hint: { marginTop: 8, color: "#9ca3af", textAlign: "center" },

  switchRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  switchLabel: { color: "#9ca3af" },
  searchWrap: {
    marginTop: 10,
    position: "relative",
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontFamily: "sans-serif",
    paddingHorizontal: 12,
    paddingRight: 40,
    paddingVertical: 10,
  },
  searchClearBtn: {
    position: "absolute",
    right: 10,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.55)",
  },
  searchClearText: { color: "#cbd5e1", fontSize: 12, fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardTitle: { color: "#e5e7eb", fontWeight: "800", fontSize: 16 },
  cardSub: { color: "#cbd5e1", marginTop: 4 },
  cardTag: { color: "#93c5fd", marginTop: 4, fontSize: 11 },
  cardHint: { color: "#9ca3af", marginTop: 8, fontSize: 12 },

  drawer: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(10,14,35,0.98)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  drawerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  drawerTitle: { color: "#e5e7eb", fontWeight: "900", fontSize: 16 },
  drawerSub: { color: "#cbd5e1", marginTop: 3 },
  closeBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  closeText: { color: "#e5e7eb", fontSize: 18 },

  legendWrap: { marginTop: 10 },
  legendTitle: { color: "#cbd5e1", fontWeight: "700", marginBottom: 6, fontSize: 12 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  legendChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  legendChipText: { color: "#dbeafe", fontSize: 11, fontWeight: "700" },

  openBtn: {
    marginTop: 10,
    backgroundColor: "rgba(99,102,241,0.25)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.45)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  openBtnText: { color: "#e5e7eb", fontWeight: "800" },
});
