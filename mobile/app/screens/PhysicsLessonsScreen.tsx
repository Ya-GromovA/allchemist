import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ListRenderItemInfo,
  Easing,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@app/theme/colors";
import { getLessonBlocks, LessonBlock } from "@app/db/lessonBlocksRepository";
import { getTasksByModule, Task } from "@app/db/tasksRepository";
import { useI18n } from "@app/i18n";
import { getCompletedTaskIdsForUser } from "@app/db/userProgressRepository";
import { getDeviceId } from "@app/services/deviceId";
import type { RootStackParamList } from "@app/navigation/RootNavigator";

type R = RouteProp<RootStackParamList, "PhysicsLessons">;

export default function PhysicsLessonsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();

  const focusLessonId = route.params?.focusLessonId;

  const listRef = useRef<FlatList<LessonBlock> | null>(null);

  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const reveal = useRef(new Animated.Value(0)).current;

  const load = async () => {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const [b, allTasks, completed] = await Promise.all([
        getLessonBlocks("physics", lang),
        getTasksByModule("physics", lang),
        getCompletedTaskIdsForUser(deviceId),
      ]);
      setBlocks(b);
      setTasks(allTasks);
      setCompletedTaskIds(new Set(completed));
    } catch (e: any) {
      console.error("[PhysicsLessonsScreen] load error:", e?.message ?? e);
      setBlocks([]);
      setTasks([]);
      setCompletedTaskIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lang]);

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  // Autoscroll to a specific lesson when opened from analytics/teacher_demo
  useEffect(() => {
    if (!focusLessonId) return;
    if (loading) return;
    if (!blocks.length) return;

    const idx = blocks.findIndex((b) => Number(b.id) === Number(focusLessonId));
    if (idx < 0) return;

    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
      } catch {
        // handled by onScrollToIndexFailed
      }
    }, 220);

    return () => clearTimeout(t);
  }, [focusLessonId, loading, blocks]);

  const totalLessons = useMemo(() => blocks.length, [blocks]);
  const totalTasks = useMemo(() => tasks.length, [tasks]);
  const doneTasks = useMemo(
    () => tasks.filter((t) => completedTaskIds.has(String(t.id))).length,
    [tasks, completedTaskIds]
  );
  const progress = useMemo(
    () => (totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0),
    [doneTasks, totalTasks]
  );

  const recommendation = useMemo(() => {
    if (progress < 30)
      return lang === "ru"
        ? "Начни с коротких числовых задач для уверенного старта."
        : "Start with short numeric tasks for confidence.";
    if (progress < 70)
      return lang === "ru"
        ? "Добавь открытые задачи и обсуждение решений с AI-наставником."
        : "Add open tasks and discuss solutions with AI mentor.";
    return lang === "ru"
      ? "Отличный темп. Пора перейти к демонстрациям и мини-проектам."
      : "Great pace. Move to demos and mini projects.";
  }, [progress, lang]);

  const renderItem = ({ item }: ListRenderItemInfo<LessonBlock>) => {
    const taskCount = tasks.filter((t) => Number(t.lesson_id) === Number(item.id)).length;
    const focused = !!focusLessonId && Number(item.id) === Number(focusLessonId);

    return (
      <Animated.View
        style={{
          opacity: reveal,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          onPress={() => nav.navigate("PhysicsTask", { lessonBlockId: item.id })}
          style={({ pressed }) => [
            styles.card,
            focused && styles.cardFocused,
            pressed && { opacity: 0.95 },
          ]}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardText}>{item.description || item.payload?.description || ""}</Text>
          <Text style={styles.cardMeta}>
            {lang === "ru" ? "Задач" : "Tasks"}: {taskCount}
            {focused ? (lang === "ru" ? "  •  сюда" : "  •  here") : ""}
          </Text>
          {taskCount > 0 ? (
            <Pressable
              onPress={() => nav.navigate("PhysicsTask", { lessonBlockId: item.id, flowMode: "demo5" })}
              style={({ pressed }) => [styles.demoFlowBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.demoFlowText}>{lang === "ru" ? "Demo flow: 5 задач + разбор" : "Demo flow: 5 tasks + review"}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  };

  const Header = (
    <Animated.View
      style={{
        paddingTop: 14,
        paddingHorizontal: 16,
        opacity: reveal,
        transform: [
          {
            translateY: reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
        ],
      }}
    >
      <Text style={styles.title}>{lang === "ru" ? "Физика — уроки" : "Physics — lessons"}</Text>
      <Text style={styles.subtitle}>
        {lang === "ru"
          ? "Режим для ученика, родителя и учителя: теория, задачи, контроль прогресса."
          : "Режим для учащегося, родителя и учителя: теория, задачи и отслеживание прогресса."}
      </Text>

      <View style={styles.topActionsRow}>
        <Pressable
          onPress={() => nav.navigate("MainTabs", { screen: "Analytics", params: { initialModule: "physics" } })}
          style={styles.topActionBtn}
        >
          <Text style={styles.topActionText}>{lang === "ru" ? "Отчет" : "Report"}</Text>
        </Pressable>
        <Pressable
          onPress={() => nav.navigate("MainTabs", { screen: "AIMentor", params: { initialSubject: "physics" } })}
          style={styles.topActionBtn2}
        >
          <Text style={styles.topActionText}>AI</Text>
        </Pressable>
      </View>

      <View style={styles.dashboardCard}>
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{totalLessons}</Text>
            <Text style={styles.metricLabel}>{lang === "ru" ? "уроков" : "lessons"}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>
              {doneTasks}/{totalTasks}
            </Text>
            <Text style={styles.metricLabel}>{lang === "ru" ? "выполнено" : "completed"}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{progress}%</Text>
            <Text style={styles.metricLabel}>{lang === "ru" ? "прогресс" : "progress"}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.recoText}>{recommendation}</Text>

        <View style={styles.roleHintsRow}>
          <Text style={styles.roleHint}>👩‍🎓 {lang === "ru" ? "Ученику: регулярные 15 минут" : "Learner: 15 min daily"}</Text>
          <Text style={styles.roleHint}>👨‍👩‍👧 {lang === "ru" ? "Родителю: смотреть динамику" : "Parent: watch trend"}</Text>
          <Text style={styles.roleHint}>👩‍🏫 {lang === "ru" ? "Учителю: показывать сценарии" : "Teacher: demo scenarios"}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{lang === "ru" ? "Уроки" : "Lessons"}</Text>
    </Animated.View>
  );

  return (
    <FlatList
      ref={(r) => {
        listRef.current = r;
      }}
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Math.max(24, insets.bottom + 90),
      }}
      data={blocks}
      keyExtractor={(b) => String(b.id)}
      renderItem={renderItem}
      ListHeaderComponent={Header}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.accentSoft} style={{ marginTop: 20 }} />
        ) : (
          <Text style={styles.empty}>
            {lang === "ru" ? "Пока нет уроков. Проверь импорт packs." : "No lessons yet. Check packs import."}
          </Text>
        )
      }
      onScrollToIndexFailed={(info) => {
        // Retry after layout
        setTimeout(() => {
          listRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: true });
        }, 250);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary },
  subtitle: { marginTop: 6, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  topActionsRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  topActionBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
  },
  topActionBtn2: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentSoft,
    backgroundColor: colors.accentMuted,
  },
  topActionText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },

  dashboardCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
  },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.cardElevated,
    alignItems: "center",
    paddingVertical: 10,
  },
  metricValue: { color: colors.textPrimary, fontSize: 17, fontWeight: "900" },
  metricLabel: { color: colors.textMuted, marginTop: 2, fontSize: 11 },

  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.borderSoft, marginTop: 10, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: colors.accentSoft },

  recoText: { marginTop: 10, color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
  roleHintsRow: { marginTop: 10, gap: 4 },
  roleHint: { color: colors.textMuted, fontSize: 11 },

  sectionTitle: { marginTop: 16, color: colors.textPrimary, fontWeight: "900" },

  card: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 14,
    marginBottom: 10,
  },
  cardFocused: {
    borderColor: "rgba(95,225,255,0.55)",
    backgroundColor: "rgba(15,17,64,0.92)",
  },
  cardTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 14 },
  cardText: { color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 16 },
  cardMeta: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  demoFlowBtn: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.45)",
    backgroundColor: "rgba(34,197,94,0.14)",
    paddingVertical: 9,
    alignItems: "center",
  },
  demoFlowText: { color: "#dcfce7", fontWeight: "900", fontSize: 12 },
  empty: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 18, textAlign: "center", paddingHorizontal: 16 },
});
