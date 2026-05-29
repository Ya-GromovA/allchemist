import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, FlatList, Animated, Easing, Vibration } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

import { execSql } from "@app/db/database";
import { getBranchLabel } from "@app/chemistry/branches";
import { getAllReactions, Reaction } from "@app/db/chemistryRepository";
import Molecule3DView, { Molecule3DData } from "@app/components/Molecule3DView";
import { colors } from "@app/theme/colors";
import { useI18n } from "@app/i18n";
import { RootStackParamList } from "@app/navigation/RootNavigator";
import { loadReactionPrefs, type ReactionPrefs } from "@app/services/reactionPrefsService";

type MoleculeRow = { id: string; name: string; formula: string; data_json: string | null };
type SideItem = { formula: string; coeff: number };
type Mode = "molecular" | "lab";
type ReactionStage = "idle" | "mixing" | "transition" | "done";
type ScreenRoute = RouteProp<RootStackParamList, "Reactions3D">;

type ReactionStep = {
  stage: ReactionStage;
  title?: string;
  text?: string;
};

type ReactionEffect = {
  gas?: string;
  precipitate?: string;
  smell?: string;
  hazard?: string;
  haptic?: "light" | "medium" | "explosion";
  sound?: string;
};

type LabVisual = {
  startColor?: string;
  mixColor?: string;
  finalColor?: string;
  precipitateColor?: string;
  vaporColor?: string;
};

type ReactionMeta = {
  reactants: SideItem[];
  products: SideItem[];
  conditions: string | null;
  steps: ReactionStep[];
  effect: ReactionEffect;
  labVisual: LabVisual;
  explainer: string;
  reactantDetails: Array<{ formula: string; label?: string; color?: string; smell?: string }>;
  productDetails: Array<{ formula: string; label?: string; color?: string; smell?: string }>;
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
  return MOLECULE_NAME_RU[value.toLowerCase()] || value;
}

const DEFAULT_PREFS: ReactionPrefs = {
  hapticsEnabled: true,
  audioEnabled: true,
  narrationEnabled: true,
};

function parseMol(row: MoleculeRow, lang: "ru" | "en"): Molecule3DData {
  try {
    const data = row.data_json ? JSON.parse(row.data_json) : {};
    const atoms = Array.isArray(data?.atoms) ? data.atoms : [];
    return {
      id: row.id,
      name: moleculeDisplayName(row.name || data?.name || "", lang, row.id),
      formula: row.formula || data?.formula || "",
      atoms,
    };
  } catch {
    return { id: row.id, name: moleculeDisplayName(row.name ?? "", lang, row.id), formula: row.formula ?? "", atoms: [] };
}
}

function normFormulaToMolId(formula: string): string {
  return `mol_${String(formula).trim().toLowerCase()}`;
}

function defaultStepText(stage: ReactionStage, lang: "ru" | "en"): string {
  if (stage === "idle") return lang === "ru" ? "Выбери режим и нажми «Запустить»" : "Choose a mode and tap Run";
  if (stage === "mixing") return lang === "ru" ? "Реагенты начинают смешиваться" : "Reactants are mixing";
  if (stage === "transition") return lang === "ru" ? "Идёт основной этап реакции" : "Main reaction stage in progress";
  return lang === "ru" ? "Реакция завершена, сравни продукты и наблюдения" : "Reaction finished, compare products and observations";
}

function parseReactionMeta(reaction: Reaction | null, lang: "ru" | "en"): ReactionMeta | null {
  if (!reaction) return null;
  const data = reaction.data ?? {};
  const reactants: SideItem[] = Array.isArray(reaction.reactants) ? reaction.reactants : [];
  const products: SideItem[] = Array.isArray(reaction.products) ? reaction.products : [];

  const stepsRaw = Array.isArray(data?.steps) ? data.steps : [];
  const steps = stepsRaw
    .map((x: any) => ({
      stage: String(x?.stage ?? "idle") as ReactionStage,
      title: String(x?.title ?? "").trim() || undefined,
      text: String(x?.text ?? "").trim() || undefined,
    }))
    .filter((x: ReactionStep) => x.stage === "idle" || x.stage === "mixing" || x.stage === "transition" || x.stage === "done");

  return {
    reactants,
    products,
    conditions: reaction.conditions || null,
    steps,
    effect: typeof data?.effect === "object" && data.effect ? data.effect : {},
    labVisual: typeof data?.lab_visual === "object" && data.lab_visual ? data.lab_visual : {},
    explainer: String(data?.explainer ?? "").trim() || (lang === "ru" ? "Подробный комментарий к реакции будет отображаться здесь." : "Detailed reaction commentary will appear here."),
    reactantDetails: Array.isArray(data?.reactant_details) ? data.reactant_details : [],
    productDetails: Array.isArray(data?.product_details) ? data.product_details : [],
  };
}

export default function Reactions3DScreen() {
  const { lang } = useI18n();
  const route = useRoute<ScreenRoute>();
  const branch = route.params?.branch;

  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [mode, setMode] = useState<Mode>("molecular");
  const [stage, setStage] = useState<ReactionStage>("idle");
  const [molecule, setMolecule] = useState<Molecule3DData | null>(null);
  const [prefs, setPrefs] = useState<ReactionPrefs>(DEFAULT_PREFS);

  const sim = useRef(new Animated.Value(0)).current;
  const bubbles = useRef(new Animated.Value(0)).current;
  const stageTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await getAllReactions(lang, branch);
        setReactions(list);
        setSelectedReaction(list[0] ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [lang, branch]);

  useEffect(() => {
    (async () => {
      try {
        setPrefs(await loadReactionPrefs());
      } catch {
        setPrefs(DEFAULT_PREFS);
      }
    })();
  }, []);

  const parsedReaction = useMemo(() => parseReactionMeta(selectedReaction, lang), [selectedReaction, lang]);

  const stageCopy = useMemo(() => {
    const map = new Map<ReactionStage, ReactionStep>();
    for (const step of parsedReaction?.steps ?? []) {
      map.set(step.stage, step);
    }
    const current = map.get(stage);
    return {
      title: current?.title || (lang === "ru" ? "Ход реакции" : "Reaction flow"),
      text: current?.text || defaultStepText(stage, lang),
    };
  }, [parsedReaction?.steps, stage, lang]);

  async function loadMoleculeByFormula(formula: string) {
    const molId = normFormulaToMolId(formula);
    const res = await execSql(`SELECT id, name, formula, data_json FROM molecules WHERE id=? LIMIT 1;`, [molId]);
    const row = (res?.[0] as any) as MoleculeRow | undefined;
    if (!row) {
      setMolecule(null);
      return;
    }
    setMolecule(parseMol(row, lang));
  }

  useEffect(() => {
    if (!parsedReaction) return;
    const first = parsedReaction.reactants?.[0]?.formula || parsedReaction.products?.[0]?.formula;
    if (first) void loadMoleculeByFormula(first);
  }, [parsedReaction]);

  useEffect(() => {
    if (mode !== "lab") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bubbles, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bubbles, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mode, bubbles]);

  useEffect(() => () => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
  }, []);

  const runReaction = () => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    setStage("mixing");
    sim.setValue(0);

    stageTimers.current.push(setTimeout(() => setStage("transition"), 1100));
    stageTimers.current.push(
      setTimeout(() => {
        setStage("done");
        if (prefs.hapticsEnabled && parsedReaction?.effect?.haptic) {
          const pattern = parsedReaction.effect.haptic === "explosion" ? [0, 90, 70, 180] : parsedReaction.effect.haptic === "medium" ? [0, 60] : [0, 30];
          Vibration.vibrate(pattern);
        }
      }, 2500)
    );

    Animated.sequence([
      Animated.timing(sim, { toValue: 0.35, duration: 1000, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(sim, { toValue: 0.7, duration: 1200, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(sim, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false }),
    ]).start(() => setStage("done"));
  };

  const progress = sim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const liquidLevel = sim.interpolate({ inputRange: [0, 1], outputRange: ["24%", "72%"] });
  const bubbleY = bubbles.interpolate({ inputRange: [0, 1], outputRange: [10, -28] });
  const vaporOpacity = sim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.12, 0.38] });

  const startColor = parsedReaction?.labVisual?.startColor ?? "rgba(59,130,246,0.48)";
  const mixColor = parsedReaction?.labVisual?.mixColor ?? "rgba(99,102,241,0.48)";
  const finalColor = parsedReaction?.labVisual?.finalColor ?? "rgba(16,185,129,0.48)";
  const precipitateColor = parsedReaction?.labVisual?.precipitateColor ?? "rgba(191,219,254,0.75)";
  const vaporColor = parsedReaction?.labVisual?.vaporColor ?? "rgba(248,250,252,0.28)";
  const liquidColor = sim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [startColor, mixColor, finalColor] });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentSoft} />
        <Text style={styles.hint}>{lang === "ru" ? "Загрузка реакций…" : "Loading reactions…"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{lang === "ru" ? "Реакции 3D" : "Reactions 3D"}</Text>
      {!!branch && <Text style={styles.branchHint}>{lang === "ru" ? `Раздел: ${getBranchLabel(branch, lang)}` : `Branch: ${getBranchLabel(branch, lang)}`}</Text>}
      <Text style={styles.subtitle}>
        {lang === "ru"
          ? "Два режима: молекулярное взаимодействие и лабораторная сцена. Переключение происходит внутри одной и той же реакции."
          : "Two modes: molecular interaction and laboratory scene within the same reaction."}
      </Text>

      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode("molecular")} style={[styles.modeBtn, mode === "molecular" && styles.modeBtnActive]}>
          <Text style={[styles.modeText, mode === "molecular" && styles.modeTextActive]}>{lang === "ru" ? "Молекулярный режим" : "Molecular mode"}</Text>
        </Pressable>
        <Pressable onPress={() => setMode("lab")} style={[styles.modeBtn, mode === "lab" && styles.modeBtnActive]}>
          <Text style={[styles.modeText, mode === "lab" && styles.modeTextActive]}>{lang === "ru" ? "Пробирка / колба" : "Test tube / flask"}</Text>
        </Pressable>
      </View>

      <View style={styles.split}>
        <View style={styles.left}>
          <FlatList
            data={reactions}
            keyExtractor={(x) => x.id}
            renderItem={({ item }) => {
              const active = item.id === selectedReaction?.id;
              return (
                <Pressable
                  onPress={() => {
                    stageTimers.current.forEach(clearTimeout);
                    stageTimers.current = [];
                    setSelectedReaction(item);
                    setStage("idle");
                    sim.setValue(0);
                  }}
                  style={[styles.rxCard, active && styles.rxCardActive]}
                >
                  <Text style={styles.rxTitle}>{item.title || item.id}</Text>
                  <Text style={styles.rxEq}>{item.equation}</Text>
                </Pressable>
              );
            }}
          />
        </View>

        <View style={styles.right}>
          <View style={styles.sectionTop}>
            <Text style={styles.sectionTitle}>{lang === "ru" ? "Состав реакции" : "Reaction composition"}</Text>
            <Pressable onPress={runReaction} style={styles.runBtn}>
              <Text style={styles.runBtnText}>{lang === "ru" ? "Запустить" : "Run"}</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.badgeTitle}>{lang === "ru" ? "Реагенты" : "Reactants"}</Text>
            <View style={styles.badges}>
              {(parsedReaction?.reactants ?? []).map((x, idx) => (
                <Pressable key={`r-${idx}-${x.formula}`} onPress={() => loadMoleculeByFormula(x.formula)} style={styles.badge}>
                  <Text style={styles.badgeText}>{x.coeff > 1 ? `${x.coeff}` : ""}{x.formula}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.badgeTitle}>{lang === "ru" ? "Продукты" : "Products"}</Text>
            <View style={styles.badges}>
              {(parsedReaction?.products ?? []).map((x, idx) => (
                <Pressable key={`p-${idx}-${x.formula}`} onPress={() => loadMoleculeByFormula(x.formula)} style={styles.badge}>
                  <Text style={styles.badgeText}>{x.coeff > 1 ? `${x.coeff}` : ""}{x.formula}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progress }]} />
          </View>

          {prefs.narrationEnabled ? (
            <View style={styles.storyCard}>
              <Text style={styles.storyTitle}>{stageCopy.title}</Text>
              <Text style={styles.storyText}>{stageCopy.text}</Text>
              <Text style={styles.storyText}>{parsedReaction?.explainer ?? ""}</Text>
            </View>
          ) : null}

          <View style={styles.observationRow}>
            {!!parsedReaction?.effect?.gas && <View style={styles.obsChip}><Text style={styles.obsText}>Газ: {parsedReaction.effect.gas}</Text></View>}
            {!!parsedReaction?.effect?.precipitate && <View style={styles.obsChip}><Text style={styles.obsText}>Осадок: {parsedReaction.effect.precipitate}</Text></View>}
            {!!parsedReaction?.effect?.smell && <View style={styles.obsChip}><Text style={styles.obsText}>Запах: {parsedReaction.effect.smell}</Text></View>}
            {!!parsedReaction?.effect?.hazard && <View style={styles.obsChip}><Text style={styles.obsText}>Эффект: {parsedReaction.effect.hazard}</Text></View>}
            {!!parsedReaction?.effect?.sound && prefs.audioEnabled && <View style={styles.obsChip}><Text style={styles.obsText}>Звук: {parsedReaction.effect.sound}</Text></View>}
          </View>

          {mode === "molecular" ? (
            molecule ? (
              <Molecule3DView molecule={molecule} height={320} />
            ) : (
              <View style={styles.empty3d}><Text style={styles.hint}>{lang === "ru" ? "Нет 3D-данных для молекулы." : "No 3D data for molecule."}</Text></View>
            )
          ) : (
            <View style={styles.labCard}>
              <Text style={styles.labTitle}>{lang === "ru" ? "Лабораторная сцена" : "Lab scene"}</Text>
              <View style={styles.flask}>
                <Animated.View style={[styles.liquid, { height: liquidLevel, backgroundColor: liquidColor as any }]} />
                <View style={[styles.precipitate, { backgroundColor: precipitateColor, opacity: stage === "done" && parsedReaction?.effect?.precipitate ? 0.95 : 0.0 }]} />
                <Animated.View style={[styles.vapor, { opacity: vaporOpacity, backgroundColor: vaporColor }]} />
                <Animated.View style={[styles.bubble, { transform: [{ translateY: bubbleY }] }]} />
                <Animated.View style={[styles.bubbleSmall, { transform: [{ translateY: bubbleY }] }]} />
              </View>
              <Text style={styles.labHint}>{defaultStepText(stage, lang)}</Text>
              {!!parsedReaction?.conditions && <Text style={styles.conditionText}>{parsedReaction.conditions}</Text>}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 12 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  hint: { marginTop: 10, color: colors.textMuted, textAlign: "center" },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "900" },
  branchHint: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  subtitle: { color: colors.textSecondary, marginTop: 4, marginBottom: 10, fontSize: 12 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  modeBtn: { flex: 1, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  modeBtnActive: { borderColor: colors.accentSoft, backgroundColor: colors.cardElevated },
  modeText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  modeTextActive: { color: colors.textPrimary },
  split: { flex: 1, flexDirection: "row", gap: 12 },
  left: { width: 240 },
  right: { flex: 1 },
  rxCard: { borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: 10, marginBottom: 8 },
  rxCardActive: { borderColor: colors.accentSoft, backgroundColor: colors.cardElevated },
  rxTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 12 },
  rxEq: { color: colors.textSecondary, marginTop: 4, fontSize: 11 },
  sectionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 14 },
  runBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.accentSoft, backgroundColor: colors.accentMuted },
  runBtnText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },
  row: { marginBottom: 8 },
  badgeTitle: { color: colors.textSecondary, fontWeight: "700", marginBottom: 6, fontSize: 12 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card },
  badgeText: { color: colors.textPrimary, fontWeight: "700", fontSize: 11 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.borderSoft, marginVertical: 10, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: colors.accentSoft },
  storyCard: { borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: 12, marginBottom: 10 },
  storyTitle: { color: colors.textPrimary, fontWeight: "900", marginBottom: 6 },
  storyText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  observationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  obsChip: { borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardElevated, paddingHorizontal: 10, paddingVertical: 6 },
  obsText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
  empty3d: { height: 320, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  labCard: { borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: 12, minHeight: 320 },
  labTitle: { color: colors.textPrimary, fontWeight: "900", marginBottom: 8 },
  flask: { height: 180, borderRadius: 18, borderWidth: 2, borderColor: "rgba(148,163,184,0.45)", backgroundColor: "rgba(30,41,59,0.5)", overflow: "hidden", justifyContent: "flex-end", marginBottom: 10 },
  liquid: { width: "100%" },
  precipitate: { position: "absolute", left: 0, right: 0, bottom: 0, height: 26 },
  vapor: { position: "absolute", left: 10, right: 10, top: 18, height: 48, borderRadius: 20 },
  bubble: { position: "absolute", left: "48%", bottom: 24, width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(191,219,254,0.85)" },
  bubbleSmall: { position: "absolute", left: "38%", bottom: 16, width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(191,219,254,0.7)" },
  labHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  conditionText: { color: colors.textMuted, fontSize: 11 },
});
