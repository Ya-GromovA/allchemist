import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

import { RootStackParamList } from "@app/navigation/RootNavigator";
import { colors } from "@app/theme/colors";
import { useI18n } from "@app/i18n";
import { getTasksByLesson, Task } from "@app/db/tasksRepository";
import { markTaskCompleted } from "@app/db/userProgressRepository";
import { getDeviceId } from "@app/services/deviceId";
import { getActiveLiveSession } from "@app/services/liveSessionService";
import { trackLearningEvent } from "@app/services/learningEventService";
import { useAppSession } from "@app/state/AppSession";

function pickMistakeTag(task: Task): string {
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const filtered = tags.filter((x) => !["ru", "en", "generated"].includes(String(x).toLowerCase()));
  if (filtered.length) return String(filtered[0]);
  return "general_concept";
}

export default function ChemistryTaskScreen() {
  const { lang } = useI18n();
  const { userId, role } = useAppSession();
  const route = useRoute<RouteProp<RootStackParamList, "ChemistryTask">>();
  const lessonId = route.params?.lessonId;
  const taskIds = route.params?.taskIds ?? [];
  const branch = route.params?.branch;
  const flowMode = route.params?.flowMode ?? "standard";
  const topicTitle = route.params?.topicTitle ?? "Тема химии";
  const theoryMode = route.params?.theoryMode ?? "grade";
  const theoryShort = route.params?.theoryShort ?? "";
  const keyTerms = route.params?.keyTerms ?? [];

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<string>("");
  const [taskStatus, setTaskStatus] = useState<Record<string, "correct" | "wrong">>({});
  const [taskStartedAt, setTaskStartedAt] = useState<number>(Date.now());
  const cardIn = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const feedbackFlash = useRef(new Animated.Value(0)).current;

  const load = async () => {
    setLoading(true);
    try {
      const list = lessonId ? await getTasksByLesson(lessonId, lang, branch) : [];
      const filtered = taskIds.length ? list.filter((t) => taskIds.includes(String(t.id))) : list;
      const finalTasks = flowMode === "demo5" ? filtered.slice(0, 5) : filtered;
      setTasks(finalTasks);
      setIdx(0);
      setTaskStartedAt(Date.now());
      setResult("");
      setTaskStatus({});
    } catch (e: any) {
      setTasks([]);
      setIdx(0);
      setResult(lang === "ru" ? "Ошибка загрузки задач" : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lessonId, lang, branch, flowMode]);

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
    await markTaskCompleted(deviceId, String(current.id), score, undefined, "chemistry", String(lessonId ?? ""));

    const activeLive = await getActiveLiveSession();
    const mistakeTag = pickMistakeTag(current);
    const durationSec = Math.max(1, Math.round((Date.now() - taskStartedAt) / 1000));

    await trackLearningEvent({
      eventType: "task_result",
      userId,
      role: role ?? undefined,
      moduleId: "chemistry",
      lessonId: String(lessonId ?? "general"),
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
    feedbackFlash.setValue(0.24);
    Animated.timing(feedbackFlash, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
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
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentSoft} />
        <Text style={styles.hint}>{lang === "ru" ? "Загрузка задачи..." : "Loading task..."}</Text>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{lang === "ru" ? "Химия — задачи" : "Chemistry — tasks"}</Text>
        <Text style={styles.hint}>{lang === "ru" ? "Нет задач в этом уроке." : "No tasks in this lesson."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
      <Text style={styles.title}>
        {lang === "ru" ? "Химия — задачи" : "Chemistry — tasks"} • {idx + 1}/{tasks.length}
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
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      )}

      <View style={styles.topicCard}>
        <Text style={styles.topicCardTitle}>{topicTitle}</Text>
        <Text style={styles.topicCardMeta}>{theoryMode === "bookline" ? "Практика по учебной линии" : "Базовая практика по классу"}</Text>
        {!!theoryShort && <Text style={styles.topicCardText}>{theoryShort}</Text>}
        {!!keyTerms.length && <Text style={styles.topicCardText}>Ключевые термины: {keyTerms.join(", ")}</Text>}
      </View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [
              {
                translateY: cardIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View style={[styles.feedbackOverlay, { opacity: feedbackFlash }]} />
        <Text style={styles.cardTitle}>{current.title}</Text>
        <Text style={styles.cardText}>{current.description}</Text>

        <View style={styles.hr} />

        <Text style={styles.meta}>
          {lang === "ru" ? "Тип:" : "Type:"} {current.type}
        </Text>

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

      <View style={styles.block}>
        <Text style={styles.blockTitle}>{lang === "ru" ? "3D и реакции" : "3D & reactions"}</Text>
        <Text style={styles.blockText}>
          {lang === "ru"
            ? "Просмотр молекул/реакций в 3D вынесен в отдельные экраны, чтобы 3D не мешал стабильности задач."
            : "Molecules/reactions 3D are on separate screens to keep tasks stable."}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 18 },

  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "900" },
  flowBadge: { marginTop: 6, color: "#c7d2fe", fontSize: 12, fontWeight: "700" },
  progressTrack: { marginTop: 8, height: 8, borderRadius: 999, backgroundColor: "rgba(148,163,184,0.25)", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "rgba(34,197,94,0.8)" },
  topicCard: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: "rgba(125,211,252,0.28)", backgroundColor: "rgba(10,11,46,0.85)", padding: 12 },
  topicCardTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 15 },
  topicCardMeta: { color: "#7dd3fc", marginTop: 6, fontSize: 12, fontWeight: "800" },
  topicCardText: { color: colors.textSecondary, marginTop: 6, lineHeight: 18, fontSize: 12 },
  hint: { marginTop: 10, color: colors.textMuted, textAlign: "center" },

  card: { marginTop: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 14, overflow: "hidden" },
  feedbackOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(56,189,248,0.25)" },
  cardTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 14 },
  cardText: { color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 16 },
  hr: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12 },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
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

  block: { marginTop: 14, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(99,102,241,0.25)", backgroundColor: "rgba(99,102,241,0.08)" },
  blockTitle: { color: colors.textPrimary, fontWeight: "900" },
  blockText: { marginTop: 8, color: colors.textSecondary, lineHeight: 19 }
});
