import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";

import AppBackground from "@app/components/AppBackground";
import { colors } from "@app/theme/colors";
import { useI18n } from "@app/i18n";
import { getDeviceId } from "@app/services/deviceId";
import { api } from "@app/config/api";
import { MainTabParamList } from "@app/navigation/MainTabs";

type PropsRoute = RouteProp<MainTabParamList, "Analytics">;

type AnalyticsResponse = {
  totals: {
    tasks_total: number;
    tasks_completed: number;
    progress_pct: number;
    avg_score_completed: number;
    last_active_utc: string | null;
  };
  per_module: Array<{
    module_id: string;
    tasks_total: number;
    tasks_completed: number;
    progress_pct: number;
    avg_score_completed: number;
    last_active_utc: string | null;
  }>;
  weak_topics: Array<{ tag: string; count: number }>;
  skill_graph?: {
    skills: Array<{
      tag: string;
      tasks_total: number;
      attempted: number;
      completed: number;
      avg_score_completed: number;
      completion_rate: number;
      mastery: number;
      risk: "low" | "medium" | "high";
    }>;
    recommend_next: string[];
  };
  lessons_report?: Array<{
    lesson_id: number;
    module_id: string;
    title: string;
    risk: "low" | "medium" | "high";
    tasks_total: number;
    tasks_completed: number;
    avg_score_completed: number;
    stuck: Array<{ task_id: string; title: string }>;
    needs_repeat: Array<{ task_id: string; title: string }>;
  }>;
  learning_effectiveness?: {
    before: { attempts: number; completionRate: number; avgScore: number };
    after: { attempts: number; completionRate: number; avgScore: number };
    uplift: { completionRateDelta: number; avgScoreDelta: number };
    ab: { bucket: "A" | "B"; variant: string };
    integrity: { totalTaskEvents: number; tooFastAnswers: number; tooFastSharePct: number };
  };
  activity: Array<{ day: string; completed: number; avg_score: number }>;
  last_items: Array<{
    task_id: string;
    title: string | null;
    module_id: string;
    lesson_id: string;
    score: number;
    updated_at_utc: string | null;
  }>;
};

export default function AnalyticsScreen() {
  const { lang } = useI18n();
  const nav = useNavigation<any>();
  const stack = nav.getParent?.() ?? nav;
  const route = useRoute<PropsRoute>();

  const initial = route.params?.initialModule;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string | null>(initial ?? null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const res = await api.get(`/progress/analytics/${encodeURIComponent(deviceId)}`, {
        params: { lang, module_id: moduleFilter, days: 14 },
        headers: { "X-Allow-Offline-Network": "1" },
      });
      setData(res.data as AnalyticsResponse);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lang, moduleFilter]);

  const maxDaily = useMemo(() => {
    const vals = (data?.activity ?? []).map((a) => a.completed);
    return Math.max(1, ...vals);
  }, [data]);

  const effect = data?.learning_effectiveness ?? null;

  return (
    <View style={styles.root}>
      <AppBackground />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.title}>{lang === "ru" ? "Отчет" : "Report"}</Text>
        <Text style={styles.subtitle}>{lang === "ru" ? "Реальные данные: прогресс, динамика, риски и контроль качества прохождения." : "Real data: progress, trends, risk and integrity checks."}</Text>

        <View style={styles.filtersRow}>
          <Pressable onPress={() => setModuleFilter(null)} style={[styles.filterBtn, moduleFilter === null && styles.filterBtnActive]}><Text style={[styles.filterText, moduleFilter === null && styles.filterTextActive]}>{lang === "ru" ? "Все" : "All"}</Text></Pressable>
          <Pressable onPress={() => setModuleFilter("physics")} style={[styles.filterBtn, moduleFilter === "physics" && styles.filterBtnActive]}><Text style={[styles.filterText, moduleFilter === "physics" && styles.filterTextActive]}>{lang === "ru" ? "Физика" : "Physics"}</Text></Pressable>
          <Pressable onPress={() => setModuleFilter("chemistry")} style={[styles.filterBtn, moduleFilter === "chemistry" && styles.filterBtnActive]}><Text style={[styles.filterText, moduleFilter === "chemistry" && styles.filterTextActive]}>{lang === "ru" ? "Химия" : "Chemistry"}</Text></Pressable>
          <Pressable onPress={load} style={styles.refreshBtn}><Text style={styles.refreshText}>{lang === "ru" ? "Обновить" : "Refresh"}</Text></Pressable>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accentSoft} /><Text style={styles.muted}>{lang === "ru" ? "Загрузка отчета..." : "Loading report..."}</Text></View>
        ) : error ? (
          <View style={styles.card}><Text style={styles.cardTitle}>{lang === "ru" ? "Ошибка" : "Error"}</Text><Text style={styles.cardText}>{error}</Text></View>
        ) : !data ? (
          <Text style={styles.muted}>{lang === "ru" ? "Нет данных." : "No data."}</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Итого" : "Totals"}</Text>
              <View style={styles.metricsRow}>
                <View style={styles.metricBox}><Text style={styles.metricValue}>{data.totals.tasks_completed}/{data.totals.tasks_total}</Text><Text style={styles.metricLabel}>{lang === "ru" ? "выполнено" : "done"}</Text></View>
                <View style={styles.metricBox}><Text style={styles.metricValue}>{data.totals.progress_pct}%</Text><Text style={styles.metricLabel}>{lang === "ru" ? "прогресс" : "progress"}</Text></View>
                <View style={styles.metricBox}><Text style={styles.metricValue}>{data.totals.avg_score_completed}</Text><Text style={styles.metricLabel}>{lang === "ru" ? "ср.оценка" : "avg"}</Text></View>
              </View>
              <Text style={styles.smallMuted}>{lang === "ru" ? "Последняя активность:" : "Last active:"} {data.totals.last_active_utc ?? "-"}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Эффективность обучения" : "Learning effectiveness"}</Text>
              {!effect ? (
                <Text style={styles.cardText}>{lang === "ru" ? "Недостаточно данных, решите больше задач." : "Not enough events yet."}</Text>
              ) : (
                <>
                  <Text style={styles.cardText}>{lang === "ru" ? `До: попыток ${effect.before.attempts}, завершение ${Math.round(effect.before.completionRate * 100)}%, средний балл ${effect.before.avgScore}` : `Before: attempts ${effect.before.attempts}, completion ${Math.round(effect.before.completionRate * 100)}%, avg ${effect.before.avgScore}`}</Text>
                  <Text style={styles.cardText}>{lang === "ru" ? `После: попыток ${effect.after.attempts}, завершение ${Math.round(effect.after.completionRate * 100)}%, средний балл ${effect.after.avgScore}` : `After: attempts ${effect.after.attempts}, completion ${Math.round(effect.after.completionRate * 100)}%, avg ${effect.after.avgScore}`}</Text>
                  <Text style={styles.cardText}>{lang === "ru" ? `Прирост: завершение ${Math.round(effect.uplift.completionRateDelta * 100)} п.п., балл ${Math.round(effect.uplift.avgScoreDelta * 100)} п.п.` : `Uplift: completion ${Math.round(effect.uplift.completionRateDelta * 100)}pp, score ${Math.round(effect.uplift.avgScoreDelta * 100)}pp`}</Text>
                  <Text style={styles.cardText}>{lang === "ru" ? `A/B: группа ${effect.ab.bucket} (${effect.ab.variant})` : `A/B: ${effect.ab.bucket} (${effect.ab.variant})`}</Text>
                  <Text style={styles.cardText}>{lang === "ru" ? `Контроль качества: слишком быстрых ответов ${effect.integrity.tooFastAnswers}/${effect.integrity.totalTaskEvents} (${effect.integrity.tooFastSharePct}%)` : `Integrity: too-fast ${effect.integrity.tooFastAnswers}/${effect.integrity.totalTaskEvents} (${effect.integrity.tooFastSharePct}%)`}</Text>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Активность по дням" : "Daily activity"}</Text>
              {(data.activity ?? []).length === 0 ? (
                <Text style={styles.cardText}>{lang === "ru" ? "Пока нет активности." : "No activity yet."}</Text>
              ) : (
                <View style={{ marginTop: 8, gap: 8 }}>
                  {data.activity.map((a) => (
                    <View key={a.day} style={styles.barRow}>
                      <Text style={styles.barLabel}>{a.day}</Text>
                      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.round((a.completed / maxDaily) * 100)}%` }]} /></View>
                      <Text style={styles.barValue}>{a.completed}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Навыки" : "Skills"}</Text>
              {!(data.skill_graph?.skills?.length ?? 0) ? (
                <Text style={styles.cardText}>{lang === "ru" ? "Пока нет данных по навыкам." : "No skill data yet."}</Text>
              ) : (
                <View style={{ marginTop: 8, gap: 10 }}>
                  {data.skill_graph!.skills.slice(0, 10).map((s) => (
                    <View key={s.tag} style={styles.lastRow}>
                      <Text style={styles.lastTitle}>{s.tag} • {Math.round((s.mastery ?? 0) * 100)}%</Text>
                      <Text style={styles.smallMuted}>{lang === "ru" ? `попыток ${s.attempted} • выполнено ${s.completed}/${s.tasks_total} • риск ${s.risk}` : `attempted ${s.attempted} • done ${s.completed}/${s.tasks_total} • risk ${s.risk}`}</Text>
                    </View>
                  ))}
                  {(data.skill_graph?.recommend_next ?? []).length ? <Text style={styles.smallMuted}>{lang === "ru" ? "Рекомендуем дальше:" : "Recommend next:"} {(data.skill_graph?.recommend_next ?? []).join(", ")}</Text> : null}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Отчет по урокам" : "Lessons report"}</Text>
              {!(data.lessons_report?.length ?? 0) ? (
                <Text style={styles.cardText}>{lang === "ru" ? "Пока нет данных по урокам." : "No lesson data yet."}</Text>
              ) : (
                <View style={{ marginTop: 8, gap: 10 }}>
                  {data.lessons_report!.slice(0, 8).map((l) => (
                    <View key={String(l.lesson_id)} style={styles.lastRow}>
                      <Text style={styles.lastTitle}>{l.title}</Text>
                       <Text style={styles.smallMuted}>{lang === "ru" ? `${l.module_id} • ${l.tasks_completed}/${l.tasks_total} • ср.балл ${l.avg_score_completed} • риск ${l.risk}` : `${l.module_id} • ${l.tasks_completed}/${l.tasks_total} • avg ${l.avg_score_completed} • risk ${l.risk}`}</Text>
                      <Pressable
                        onPress={() => {
                          if (l.module_id === "physics") stack.navigate?.("PhysicsLessons", { focusLessonId: Number(l.lesson_id) });
                          else if (l.module_id === "chemistry") stack.navigate?.("ChemistryLessons", { focusLessonId: Number(l.lesson_id) });
                        }}
                        style={({ pressed }) => [styles.openLessonFromReportBtn, pressed && { opacity: 0.92 }]}
                      >
                        <Text style={styles.openLessonFromReportText}>{lang === "ru" ? "Открыть урок" : "Open lesson"}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Слабые темы" : "Weak topics"}</Text>
              {(data.weak_topics ?? []).length === 0 ? (
                <Text style={styles.cardText}>{lang === "ru" ? "Пока не выявлены." : "Not detected yet."}</Text>
              ) : (
                <View style={styles.chipsWrap}>
                  {data.weak_topics.map((w) => (
                    <View key={w.tag} style={styles.chip}><Text style={styles.chipText}>{w.tag}</Text><Text style={styles.chipCount}>{w.count}</Text></View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Последние действия" : "Latest"}</Text>
              {(data.last_items ?? []).length === 0 ? (
                <Text style={styles.cardText}>{lang === "ru" ? "Пока пусто." : "Empty."}</Text>
              ) : (
                <View style={{ marginTop: 8, gap: 10 }}>
                  {data.last_items.slice(0, 8).map((x) => (
                    <View key={x.task_id} style={styles.lastRow}>
                      <Text style={styles.lastTitle}>{x.title ?? x.task_id}</Text>
                      <Text style={styles.smallMuted}>{x.module_id} • score: {x.score} • {x.updated_at_utc ?? ""}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingTop: 54, paddingHorizontal: 16 },
  title: { color: colors.textPrimary, fontWeight: "900", fontSize: 24 },
  subtitle: { color: colors.textSecondary, marginTop: 6, fontSize: 13, lineHeight: 18 },
  filtersRow: { marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card },
  filterBtnActive: { borderColor: colors.accentSoft, backgroundColor: colors.cardElevated },
  filterText: { color: colors.textSecondary, fontWeight: "800", fontSize: 12 },
  filterTextActive: { color: colors.textPrimary },
  refreshBtn: { marginLeft: "auto", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.accentMuted },
  refreshText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },
  center: { marginTop: 18, alignItems: "center" },
  muted: { color: colors.textMuted, marginTop: 10 },
  smallMuted: { color: colors.textMuted, marginTop: 6, fontSize: 11 },
  card: { marginTop: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 14 },
  cardTitle: { color: colors.textPrimary, fontWeight: "900" },
  cardText: { color: colors.textSecondary, marginTop: 8, fontSize: 12, lineHeight: 16 },
  metricsRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  metricBox: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardElevated, paddingVertical: 10, alignItems: "center" },
  metricValue: { color: colors.textPrimary, fontWeight: "900", fontSize: 16 },
  metricLabel: { color: colors.textMuted, marginTop: 2, fontSize: 11 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barLabel: { width: 88, color: colors.textMuted, fontSize: 11 },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: "hidden", backgroundColor: colors.borderSoft },
  barFill: { height: 10, backgroundColor: colors.accentSoft },
  barValue: { width: 24, textAlign: "right", color: colors.textSecondary, fontWeight: "800" },
  chipsWrap: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated },
  chipText: { color: colors.textPrimary, fontWeight: "800", fontSize: 12 },
  chipCount: { color: colors.textMuted, fontWeight: "900", fontSize: 12 },
  lastRow: { borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardElevated, padding: 10 },
  lastTitle: { color: colors.textPrimary, fontWeight: "800" },
  openLessonFromReportBtn: { marginTop: 10, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardElevated },
  openLessonFromReportText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },
});
