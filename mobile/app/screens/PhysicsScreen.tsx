import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { colors } from "@app/theme/colors";
import { getPhysicsScenarios, PhysicsScenario } from "@app/db/physicsRepository";
import { useI18n } from "@app/i18n";

const PhysicsScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { t, lang } = useI18n();

  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<PhysicsScenario[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const s = await getPhysicsScenarios(lang);
      setScenarios(s);
    } catch (e: any) {
      console.error("[PhysicsScreen] load error:", e?.message ?? e);
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lang]);

  const audienceCards = useMemo(
    () => [
      {
        key: "student",
        title: lang === "ru" ? "Для ученика/студента" : "For learner",
        text:
          lang === "ru"
            ? "Теория + задачи + мгновенная обратная связь от AI-наставника."
            : "Theory + tasks + instant AI feedback.",
        action: () => nav.navigate("PhysicsLessons")
      },
      {
        key: "parent",
        title: lang === "ru" ? "Для родителя" : "For parent",
        text:
          lang === "ru"
            ? "Показывайте прогресс и разбирайте темы вместе через демонстрации."
            : "Review progress and explore topics together.",
        action: () => nav.navigate("PhysicsLessons")
      },
      {
        key: "teacher",
        title: lang === "ru" ? "Для учителя" : "For teacher",
        text:
          lang === "ru"
            ? "Режим демонстрации сценариев: быстрый показ формулы, задачи и решения."
            : "Scenario demo mode for classroom explanation.",
        action: () => nav.navigate("PhysicsLessons")
      }
    ],
    [lang, nav]
  );

  const renderScenario = ({ item }: { item: PhysicsScenario }) => (
    <Pressable onPress={() => nav.navigate("PhysicsLessons")} style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardText}>
        {item.payload?.description ?? (lang === "ru" ? "Сценарий урока и задач." : "Lesson and tasks scenario.")}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.hero}>
        <Text style={styles.title}>{t("physics")}</Text>
        <Text style={styles.subtitle}>
          {lang === "ru"
            ? "Практическая физика для школы и вуза: сценарии, задачи, пояснения и поддержка для семьи и учителя."
            : "Practical physics for school and college: scenarios, tasks, explanations, and support for family and teachers."}
        </Text>

        <View style={styles.heroButtonsRow}>
          <Pressable onPress={() => nav.navigate("PhysicsLessons")} style={styles.pillBtn}>
            <Text style={styles.pillBtnText}>{lang === "ru" ? "Уроки" : "Lessons"}</Text>
          </Pressable>
          <Pressable onPress={() => nav.navigate("MainTabs", { screen: "AIMentor", params: { initialSubject: "physics" } })} style={styles.pillBtn}>
            <Text style={styles.pillBtnText}>{lang === "ru" ? "AI-наставник" : "AI Mentor"}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{lang === "ru" ? "Роли и польза" : "Audience value"}</Text>
      {audienceCards.map((card) => (
        <Pressable key={card.key} style={styles.roleCard} onPress={card.action}>
          <Text style={styles.roleTitle}>{card.title}</Text>
          <Text style={styles.roleText}>{card.text}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>{lang === "ru" ? "Сценарии демонстраций" : "Demo scenarios"}</Text>
      {loading ? (
        <ActivityIndicator color={colors.accentSoft} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={scenarios}
          keyExtractor={(s) => s.id}
          renderItem={renderScenario}
          contentContainerStyle={{ paddingTop: 4 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {lang === "ru" ? "Пока нет сценариев. Проверь импорт content packs." : "No scenarios yet. Check content packs import."}
            </Text>
          }
        />
      )}
    </ScrollView>
  );
};

export default PhysicsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 54, paddingHorizontal: 16 },

  hero: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(31,108,255,0.4)",
    backgroundColor: colors.card,
    padding: 14
  },
  title: { fontSize: 26, fontWeight: "900", color: colors.textPrimary },
  subtitle: { marginTop: 8, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  heroButtonsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pillBtn: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated
  },
  pillBtnText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },

  sectionTitle: { marginTop: 16, marginBottom: 8, color: colors.textPrimary, fontWeight: "900" },

  roleCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 8
  },
  roleTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 14 },
  roleText: { color: colors.textSecondary, marginTop: 6, fontSize: 12, lineHeight: 16 },

  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 14, marginBottom: 10 },
  cardTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 14 },
  cardText: { color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 16 },
  empty: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 6 }
});
