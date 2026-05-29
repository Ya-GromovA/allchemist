import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

import { colors } from "@app/theme/colors";
import { useI18n } from "@app/i18n";
import { getTasksByLesson, Task } from "@app/db/tasksRepository";
import { markTaskCompleted } from "@app/db/userProgressRepository";
import { getDeviceId } from "@app/services/deviceId";
import { getActiveLiveSession } from "@app/services/liveSessionService";
import { trackLearningEvent } from "@app/services/learningEventService";
import { useAppSession } from "@app/state/AppSession";

type Params = {
  PhysicsTask: { lessonBlockId: number; initialTaskId?: string; taskIds?: string[]; flowMode?: "demo5" | "standard" };
};

function pickMistakeTag(task: Task): string {
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const filtered = tags.filter((x) => !["ru", "en", "generated"].includes(String(x).toLowerCase()));
  if (filtered.length) return String(filtered[0]);
  return "general_concept";
}

const PhysicsTaskScreen: React.FC = () => {
  const { lang } = useI18n();
  const { userId, role } = useAppSession();
  const route = useRoute<RouteProp<Params, "PhysicsTask">>();
  const lessonBlockId = route.params?.lessonBlockId;
  const initialTaskId = route.params?.initialTaskId;
  const taskIds = route.params?.taskIds ?? [];
  const flowMode = route.params?.flowMode ?? "standard";

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<string>("");
  const [taskStatus, setTaskStatus] = useState<Record<string, "correct" | "wrong">>({});
  const [taskStartedAt, setTaskStartedAt] = useState<number>(Date.now());
  const cardIn = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const load = async () => {
    setLoading(true);
    try {
      const list = await getTasksByLesson(lessonBlockId, lang);
      let prepared = taskIds.length ? list.filter((t) => taskIds.includes(String(t.id))) : list;
      if (flowMode === "demo5") prepared = prepared.slice(0, 5);
      setTasks(prepared);

      if (initialTaskId) {
        const i = list.findIndex((t) => String(t.id) === String(initialTaskId));
        setIdx(i >= 0 ? i : 0);
      } else {
        setIdx(0);
      }
      setTaskStartedAt(Date.now());
      setResult("");
      setTaskStatus({});
    } catch (e: any) {
      console.error("[PhysicsTaskScreen] load error:", e?.message ?? e);
      setTasks([]);
      setIdx(0);
      setResult(lang === "ru" ? "Ошибка загрузки задач" : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lessonBlockId, initialTaskId, lang, flowMode, taskIds.join("|")]);

  useEffect(() => {
    cardIn.setValue(0);
    setTaskStartedAt(Date.now());
    Animated.timing(cardIn, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [cardIn, idx]);

  const current = useMemo(() => tasks[idx], [tasks, idx]);
  const answeredCount = useMemo(() => Object.keys(taskStatus).length, [taskStatus]);
  const wrongTasks = useMemo(() => tasks.filter((t) => taskStatus[String(t.id)] === "wrong"), [tasks, taskStatus]);
  const correctCount = useMemo(() => tasks.filter((t) => taskStatus[String(t.id)] === "correct").length, [tasks, taskStatus]);
  const flowDone = tasks.length > 0 && answeredCount >= tasks.length;

  useEffect(() => {
    const ratio = tasks.length ? answeredCount / tasks.length : 0;
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [answeredCount, tasks.length, progressAnim]);

  const onMark = async (isCorrect: boolean) => {
    if (!current) return;
    const deviceId = await getDeviceId();
    const score = isCorrect ? 1 : 0;
    await markTaskCompleted(deviceId, String(current.id), score, undefined, "physics", String(lessonBlockId ?? ""));

    const activeLive = await getActiveLiveSession();
    const mistakeTag = pickMistakeTag(current);
    const durationSec = Math.max(1, Math.round((Date.now() - taskStartedAt) / 1000));

    await trackLearningEvent({
      eventType: "task_result",
      userId,
      role: role ?? undefined,
      moduleId: "physics",
      lessonId: String(lessonBlockId ?? "general"),
      taskId: String(current.id),
      outcome: isCorrect ? "correct" : "wrong",
      sessionId: activeLive?.sessionId,
      classroom: activeLive?.classroom,
      mistakeTag,
      payload: {
        deviceId,
        score,
        durationSec,
        flowMode,
        taskType: current.type,
        tags: current.tags,
      },
    });

    setTaskStatus((prev) => ({ ...prev, [String(current.id)]: isCorrect ? "correct" : "wrong" }));
    setResult(
      isCorrect
        ? lang === "ru"
          ? "✅ Отмечено как правильно"
          : "✅ Marked as correct"
        : lang === "ru"
          ? "⚠️ Отмечено как ошибка"
          : "⚠️ Marked as wrong",
    );
  };

  const onNext = () => {
    if (current && !taskStatus[String(current.id)]) {
      setResult(lang === "ru" ? "Сначала отметь: правильно или ошибка" : "Mark correct or wrong first");
      return;
    }
    setResult("");
    setIdx((v) => Math.min(v + 1, tasks.length - 1));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accentSoft} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{lang === "ru" ? "Задачи" : "Tasks"}</Text>
        <Text style={styles.empty}>{lang === "ru" ? "Нет задач в этом уроке." : "No tasks in this lesson."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {lang === "ru" ? "Физика — задачи" : "Physics — tasks"} • {idx + 1}/{tasks.length}
      </Text>
      {flowMode === "demo5" && (
        <Text style={styles.flowBadge}>{lang === "ru" ? "Demo flow: урок → 5 задач → разбор ошибок" : "Demo flow: lesson -> 5 tasks -> error analysis"}</Text>
      )}
      {flowMode === "demo5" && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              },
            ]}
          />
        </View>
      )}

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Text style={styles.cardTitle}>{current.title}</Text>
        <Text style={styles.cardText}>{current.description}</Text>

        <View style={styles.hr} />

        <ScrollView style={{ maxHeight: 260 }}>
          <Text style={styles.meta}>{lang === "ru" ? "Тип:" : "Type:"} {current.type}</Text>
          <Text style={styles.meta}>{lang === "ru" ? "Оценка:" : "Scoring:"} {current.payload?.rubric?.type ?? current.type}</Text>
          {current.type === "open" ? (
            <Text style={styles.hint}>{lang === "ru" ? "Открытый ответ проверяется локально по rubric (keywords/criteria)." : "Open answers are scored locally using rubric (keywords/criteria)."}</Text>
          ) : null}
        </ScrollView>

        {!!result && <Text style={styles.result}>{result}</Text>}

        <View style={styles.row}>
          <Pressable onPress={() => onMark(true)} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.btnText}>{lang === "ru" ? "Правильно" : "Correct"}</Text>
          </Pressable>
          <Pressable onPress={() => onMark(false)} style={({ pressed }) => [styles.btnWrong, pressed && { opacity: 0.9 }]}>
            <Text style={styles.btnText}>{lang === "ru" ? "Ошибка" : "Wrong"}</Text>
          </Pressable>
          <Pressable onPress={onNext} style={({ pressed }) => [styles.btn2, pressed && { opacity: 0.9 }]} disabled={idx >= tasks.length - 1}>
            <Text style={styles.btnText}>{lang === "ru" ? "Далее" : "Next"}</Text>
          </Pressable>
        </View>
      </Animated.View>

      {flowDone && (
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>{lang === "ru" ? "Разбор ошибок" : "Error analysis"}</Text>
          <Text style={styles.reportMeta}>
            {lang === "ru" ? "Правильно" : "Correct"}: {correctCount}/{tasks.length} • {lang === "ru" ? "Ошибок" : "Wrong"}: {wrongTasks.length}
          </Text>
          {wrongTasks.length ? (
            <>
              <Text style={styles.reportHint}>{lang === "ru" ? "Повторить темы:" : "Repeat topics:"}</Text>
              {wrongTasks.map((task) => (
                <Text key={String(task.id)} style={styles.reportItem}>- {task.title}</Text>
              ))}
            </>
          ) : (
            <Text style={styles.reportHint}>{lang === "ru" ? "Отлично! Можно переходить к следующему уроку." : "Great! Move to the next lesson."}</Text>
          )}
        </View>
      )}
    </View>
  );
};

export default PhysicsTaskScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 54, paddingHorizontal: 16 },
  title: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  flowBadge: { marginTop: 6, color: "#c7d2fe", fontSize: 12, fontWeight: "700" },
  progressTrack: { marginTop: 8, height: 8, borderRadius: 999, backgroundColor: "rgba(148,163,184,0.25)", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "rgba(34,197,94,0.8)" },
  empty: { color: colors.textMuted, marginTop: 16 },
  card: { marginTop: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 14 },
  cardTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 14 },
  cardText: { color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 16 },
  hr: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12 },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 16 },
  result: { marginTop: 10, color: colors.accentSoft, fontWeight: "800" },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center", backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accentSoft },
  btnWrong: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center", backgroundColor: "rgba(248,113,113,0.2)", borderWidth: 1, borderColor: "rgba(248,113,113,0.45)" },
  btn2: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center", backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.borderSoft },
  btnText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },
  reportCard: { marginTop: 12, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.35)", backgroundColor: "rgba(34,197,94,0.08)" },
  reportTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 14 },
  reportMeta: { marginTop: 6, color: "#bbf7d0", fontWeight: "700", fontSize: 12 },
  reportHint: { marginTop: 8, color: colors.textSecondary, lineHeight: 18 },
  reportItem: { marginTop: 6, color: colors.textPrimary, lineHeight: 18 },
});
