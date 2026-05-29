import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { CHEMISTRY_BRANCHES, getBranchLabel, type ChemistryBranchId } from "@app/chemistry/branches";
import type { ChemistryTheoryMode } from "@app/chemistry/chemistryContentSchema";
import { colors } from "@app/theme/colors";
import { getAllMolecules, getAllReactions, Molecule, Reaction } from "@app/db/chemistryRepository";
import { useI18n } from "@app/i18n";

const BRANCHES = CHEMISTRY_BRANCHES;

const ChemistryScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { t, lang } = useI18n();

  const [loading, setLoading] = useState(true);
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [branch, setBranch] = useState<ChemistryBranchId>("all");
  const [selectedGrade, setSelectedGrade] = useState("8");
  const [theoryMode, setTheoryMode] = useState<ChemistryTheoryMode>("grade");

  const glow = useRef(new Animated.Value(0)).current;
  const sectionsIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glow]);

  useEffect(() => {
    Animated.timing(sectionsIn, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sectionsIn]);

  const selectedBranch = useMemo(() => BRANCHES.find((b) => b.id === branch) ?? BRANCHES[0], [branch]);

  const load = async () => {
    setLoading(true);
    try {
      const branchArg = branch === "all" ? undefined : branch;
      const [mol, rx] = await Promise.all([getAllMolecules(lang, branchArg), getAllReactions(lang, branchArg)]);
      setMolecules(mol);
      setReactions(rx);
    } catch (e: any) {
      console.error("[ChemistryScreen] load error:", e?.message ?? e);
      setMolecules([]);
      setReactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lang, branch]);

  const stats = useMemo(
    () => ({
      molecules: molecules.length,
      reactions: reactions.length,
      lessons: lang === "ru" ? "уроки + задачи" : "lessons + tasks",
    }),
    [molecules.length, reactions.length, lang]
  );

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.5] });
  const branchLabel = getBranchLabel(selectedBranch.id, lang);
  const theoryModeTitle = theoryMode === "grade" ? "Базовая теория по классу" : "Теория по учебной линии";
  const gradeChoices = ["7", "8", "9", "10", "11"];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.heroWrap}>
        <Animated.View style={[styles.heroGlow, { opacity: glowOpacity }]} />
        <Text style={styles.title}>{t("chemistry")}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.molecules}</Text>
            <Text style={styles.statLabel}>{lang === "ru" ? "молекул" : "molecules"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.reactions}</Text>
            <Text style={styles.statLabel}>{lang === "ru" ? "реакций" : "reactions"}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{branch === "all" ? "ALL" : branch.toUpperCase()}</Text>
            <Text style={styles.statLabel}>{lang === "ru" ? "раздел" : "branch"}</Text>
          </View>
        </View>

        <Text style={styles.branchTitle}>{lang === "ru" ? "Раздел" : "Branch"}: {branchLabel}</Text>
      </View>

      <View style={styles.entryCard}>
        <Text style={styles.entryTitle}>Новый вход в модуль химии</Text>
        <Text style={styles.entryText}>
          Сначала выбери класс и режим теории, затем переходи к темам. Это первый шаг к полному chemistry redesign.
        </Text>

        <Text style={styles.entryLabel}>1) Выбери режим теории</Text>
        <View style={styles.entryRow}>
          <Pressable onPress={() => setTheoryMode("grade")} style={[styles.modeCard, theoryMode === "grade" && styles.modeCardActive]}>
            <Text style={[styles.modeTitle, theoryMode === "grade" && styles.modeTitleActive]}>Базовая теория</Text>
            <Text style={styles.modeText}>Объяснение по уровню класса без привязки к конкретному учебнику.</Text>
          </Pressable>
          <Pressable onPress={() => setTheoryMode("bookline")} style={[styles.modeCard, theoryMode === "bookline" && styles.modeCardActive]}>
            <Text style={[styles.modeTitle, theoryMode === "bookline" && styles.modeTitleActive]}>По учебной линии</Text>
            <Text style={styles.modeText}>Маршрут по теме, автору и учебной логике без дословного копирования учебника.</Text>
          </Pressable>
        </View>

        <Text style={styles.entryLabel}>2) Выбери класс</Text>
        <View style={styles.gradeRow}>
          {gradeChoices.map((grade) => (
            <Pressable key={grade} onPress={() => setSelectedGrade(grade)} style={[styles.gradeChip, selectedGrade === grade && styles.gradeChipActive]}>
              <Text style={[styles.gradeChipText, selectedGrade === grade && styles.gradeChipTextActive]}>{grade} класс</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.entryMetaBox}>
          <Text style={styles.entryMetaText}>Активный режим: {theoryModeTitle}</Text>
          <Text style={styles.entryMetaText}>Текущий класс: {selectedGrade}</Text>
        </View>

        <Pressable
          style={styles.entryPrimaryBtn}
          onPress={() =>
            nav.navigate("ChemistryLessons", {
              branch: branch === "all" ? undefined : branch,
              theoryMode,
              initialGrade: selectedGrade,
            })
          }
        >
          <Text style={styles.entryPrimaryText}>Открыть маршрут химии</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{lang === "ru" ? "Разделы химии" : "Chemistry branches"}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchRow}>
        {BRANCHES.map((b) => {
          const active = b.id === branch;
          return (
            <Pressable key={b.id} onPress={() => setBranch(b.id)} style={[styles.branchChip, active && styles.branchChipActive]}>
              <Text style={[styles.branchChipText, active && styles.branchChipTextActive]}>{lang === "ru" ? b.labelRu : b.labelEn}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>{lang === "ru" ? "Навигация по разделу" : "Branch navigation"}</Text>
      <Animated.View
        style={[
          styles.actionsGrid,
          {
            opacity: sectionsIn,
            transform: [
              {
                translateY: sectionsIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable style={styles.actionCard} onPress={() => nav.navigate("ChemistryLessons", { branch: branch === "all" ? undefined : branch })}>
          <Text style={styles.actionTitle}>{lang === "ru" ? "Уроки и задачи" : "Lessons and tasks"}</Text>
          <Text style={styles.actionText}>{stats.lessons}</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => nav.navigate("MoleculesGallery", { branch: branch === "all" ? undefined : branch })}>
          <Text style={styles.actionTitle}>{lang === "ru" ? "Молекулы 2D/3D" : "Molecules 2D/3D"}</Text>
          <Text style={styles.actionText}>{lang === "ru" ? "Карточки и 3D-представление." : "Cards and 3D view."}</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => nav.navigate("Reactions3D", { branch: branch === "all" ? undefined : branch })}>
          <Text style={styles.actionTitle}>{lang === "ru" ? "Реакции" : "Reactions"}</Text>
          <Text style={styles.actionText}>{lang === "ru" ? "Молекулярный и лабораторный режим." : "Molecular and lab modes."}</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => nav.navigate("MainTabs", { screen: "AIMentor", params: { initialSubject: "chemistry" } })}>
          <Text style={styles.actionTitle}>{lang === "ru" ? "AI-наставник" : "AI Mentor"}</Text>
          <Text style={styles.actionText}>{lang === "ru" ? "Разбор по выбранному разделу." : "Help for selected branch."}</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => nav.navigate("PeriodicTable")}>
          <Text style={styles.actionTitle}>{lang === "ru" ? "Таблица Менделеева" : "Periodic table"}</Text>
          <Text style={styles.actionText}>{lang === "ru" ? "Быстрый справочник элементов с описанием." : "Quick element reference with descriptions."}</Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.sectionTitle}>{lang === "ru" ? "Превью реакций" : "Reactions preview"}</Text>
      {loading ? (
        <ActivityIndicator color={colors.accentSoft} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={reactions.slice(0, 4)}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{item.title}</Text>
              <Text style={styles.previewEq}>{item.equation}</Text>
              {!!item.conditions && <Text style={styles.previewMeta}>{item.conditions}</Text>}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>{lang === "ru" ? "Пока нет реакций в выбранном разделе." : "No reactions for selected branch yet."}</Text>
          }
        />
      )}
    </ScrollView>
  );
};

export default ChemistryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 50, paddingHorizontal: 16 },

  heroWrap: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(95,225,255,0.28)",
    backgroundColor: "rgba(10,11,46,0.95)",
    padding: 16,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -36,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(99,102,241,0.7)",
  },

  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "900" },

  statsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(2,6,23,0.7)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    padding: 10,
  },
  statValue: { color: colors.textPrimary, fontWeight: "900", fontSize: 16 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  branchTitle: { color: "#a5b4fc", marginTop: 12, fontWeight: "800" },
  entryCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.24)",
    backgroundColor: "rgba(10,24,31,0.86)",
    padding: 14,
  },
  entryTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "900" },
  entryText: { color: colors.textSecondary, marginTop: 8, lineHeight: 19 },
  entryLabel: { color: colors.textPrimary, fontWeight: "800", marginTop: 12, marginBottom: 8 },
  entryRow: { gap: 10 },
  modeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
    padding: 12,
  },
  modeCardActive: { borderColor: "rgba(52,211,153,0.52)", backgroundColor: "rgba(16,185,129,0.12)" },
  modeTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 14 },
  modeTitleActive: { color: "#dcfce7" },
  modeText: { color: colors.textSecondary, marginTop: 6, lineHeight: 18, fontSize: 12 },
  gradeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gradeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
  },
  gradeChipActive: { borderColor: colors.accentSoft, backgroundColor: colors.cardElevated },
  gradeChipText: { color: colors.textSecondary, fontWeight: "800", fontSize: 12 },
  gradeChipTextActive: { color: colors.textPrimary },
  entryMetaBox: { marginTop: 12, gap: 4 },
  entryMetaText: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  entryPrimaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.44)",
    backgroundColor: "rgba(52,211,153,0.18)",
    alignItems: "center",
  },
  entryPrimaryText: { color: "#dcfce7", fontWeight: "900" },

  sectionTitle: { color: colors.textPrimary, fontWeight: "900", marginTop: 16, marginBottom: 8 },

  branchRow: { paddingBottom: 2, gap: 8 },
  branchChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
  },
  branchChipActive: {
    borderColor: colors.accentSoft,
    backgroundColor: colors.cardElevated,
  },
  branchChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
  branchChipTextActive: { color: colors.textPrimary },

  actionsGrid: { gap: 10 },
  actionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  actionTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 14 },
  actionText: { color: colors.textSecondary, marginTop: 6, lineHeight: 18 },

  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 8,
  },
  previewTitle: { color: colors.textPrimary, fontWeight: "800" },
  previewEq: { color: colors.textSecondary, marginTop: 6 },
  previewMeta: { color: colors.textMuted, marginTop: 6, fontSize: 12 },

  empty: { color: colors.textMuted, textAlign: "center", marginTop: 12 },
});
