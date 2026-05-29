import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Easing,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { askMentor, generateTask, getNextTask } from "../services/aiMentorService";
import { useI18n } from "@app/i18n";
import { getDeviceId } from "@app/services/deviceId";
import { upsertTask } from "@app/db/tasksRepository";

type AIMentorParams = {
  AIMentor: {
    initialSubject?: "physics" | "chemistry" | "meta";
    initialQuestion?: string;
  };
};

const SUBJECTS = [
  { id: "physics", key: "physics" as const },
  { id: "chemistry", key: "chemistry" as const },
  { id: "meta", key: "ai_mentor" as const } // “общий” визуально пусть будет AI-ментор
];

const AIMentorScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const { t, lang } = useI18n();
  const route = useRoute<RouteProp<AIMentorParams, "AIMentor">>();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState<string | undefined>("physics");
  const [forceOffline, setForceOffline] = useState(false);
  const [source, setSource] = useState<"offline" | "online" | null>(null);

  const [recommended, setRecommended] = useState<any | null>(null);
  const [generated, setGenerated] = useState<any | null>(null);
  const [p2Info, setP2Info] = useState<string>("");
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const s = route.params?.initialSubject;
    const q = route.params?.initialQuestion;
    if (s) setSubject(s);
    if (q) setQuestion(q);
  }, [route.params]);

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  const subjectLabel = useMemo(() => {
    if (subject === "physics") return t("physics");
    if (subject === "chemistry") return t("chemistry");
    return t("ai_mentor");
  }, [subject, t]);

  const onAsk = async () => {
    if (!question.trim() || loading) return;

    setLoading(true);
    setAnswer("");
    setSource(null);

    try {
      const res = await askMentor(question, subject, forceOffline, lang);
      setAnswer(res.answer);
      setSource(res.source ?? null);
    } catch (e) {
      setAnswer(t("ai_error"));
      setSource(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <Animated.View
        style={[
          styles.header,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>{t("ai_title")}</Text>
        <Text style={styles.subtitle}>
          {t("ai_subtitle")} • {subjectLabel}
        </Text>
      </Animated.View>

      <Animated.View
        style={{
          opacity: reveal,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, subject === "physics" && styles.chipActive]}
          onPress={() => setSubject("physics")}
        >
          <Text style={[styles.chipText, subject === "physics" && styles.chipTextActive]}>
            {t("physics")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, subject === "chemistry" && styles.chipActive]}
          onPress={() => setSubject("chemistry")}
        >
          <Text style={[styles.chipText, subject === "chemistry" && styles.chipTextActive]}>
            {t("chemistry")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, subject === "meta" && styles.chipActive]}
          onPress={() => setSubject("meta")}
        >
          <Text style={[styles.chipText, subject === "meta" && styles.chipTextActive]}>
            {lang === "ru" ? "Общий" : "General"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggle, forceOffline && styles.toggleActive]}
          onPress={() => setForceOffline((v) => !v)}
        >
          <View style={styles.toggleKnobWrapper}>
            <View style={[styles.toggleKnob, forceOffline && styles.toggleKnobOn]} />
          </View>
          <Text style={styles.toggleText}>{t("ai_force_offline")}</Text>
        </TouchableOpacity>
      </View>
      </Animated.View>



      {/* P2-actions: адаптивный тьютор + генератор */}
      <Animated.View
        style={[
          styles.p2Card,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [26, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sectionLabel}>{lang === "ru" ? "Умные функции" : "Smart features"}</Text>

        <View style={styles.p2Row}>
          <TouchableOpacity
            style={[styles.p2Btn, loading && styles.askButtonDisabled]}
            onPress={async () => {
              if (loading) return;
              setP2Info("");
              setRecommended(null);
              try {
                setLoading(true);
                const deviceId = await getDeviceId();
                const res = await getNextTask(deviceId, (subject as any) === "meta" ? undefined : (subject as any), lang);
                if (res?.found) {
                  setRecommended(res);
                } else {
                  setP2Info(res?.message ?? (lang === "ru" ? "Не удалось подобрать задачу" : "Cannot recommend"));
                }
              } catch (e: any) {
                setP2Info(String(e?.message ?? e));
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Text style={styles.p2BtnText}>{lang === "ru" ? "Подобрать задачу" : "Recommend"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.p2Btn2, loading && styles.askButtonDisabled]}
            onPress={async () => {
              if (loading) return;
              setP2Info("");
              setGenerated(null);
              try {
                setLoading(true);
                const subj = (subject as any) === "chemistry" ? "chemistry" : "physics";
                const res = await generateTask(subj, undefined, 2, lang);
                setGenerated(res);
              } catch (e: any) {
                setP2Info(String(e?.message ?? e));
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Text style={styles.p2BtnText}>{lang === "ru" ? "Сгенерировать" : "Generate"}</Text>
          </TouchableOpacity>
        </View>

        {!!p2Info && <Text style={styles.p2Info}>{p2Info}</Text>}

        {recommended?.task ? (
          <View style={styles.p2Result}>
            <Text style={styles.p2Title}>{recommended.task.title}</Text>
            <Text style={styles.p2Desc}>{recommended.task.description}</Text>
            {!!recommended.reason && <Text style={styles.p2Meta}>{recommended.reason}</Text>}

            <TouchableOpacity
              style={styles.p2OpenBtn}
              onPress={() => {
                const tsk = recommended.task;
                if (tsk.module_id === "physics") {
                  nav.navigate("PhysicsTask", { lessonBlockId: Number(tsk.lesson_id), initialTaskId: String(tsk.id) });
                } else if (tsk.module_id === "chemistry") {
                  nav.navigate("ChemistryTask", { lessonId: Number(tsk.lesson_id), taskIds: [String(tsk.id)] });
                }
              }}
            >
              <Text style={styles.p2OpenText}>{lang === "ru" ? "Открыть" : "Open"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {generated ? (
          <View style={styles.p2Result}>
            <Text style={styles.p2Title}>{generated.title}</Text>
            <Text style={styles.p2Desc}>{generated.description}</Text>
            <Text style={styles.p2Meta}>{lang === "ru" ? "Совет:" : "Tip:"} {lang === "ru" ? "Сохраните в задания, чтобы открыть в уроке." : "Save to tasks to open in lesson."}</Text>

            <View style={styles.p2Row}>
              <TouchableOpacity
                style={styles.p2Btn}
                onPress={async () => {
                  try {
                    await upsertTask({
                      id: String(generated.id),
                      module_id: String(generated.module_id),
                      lesson_id: Number(generated.lesson_id || 0),
                      lang,
                      title: String(generated.title),
                      description: String(generated.description),
                      type: generated.type,
                      estimated_minutes: Number(generated.estimated_minutes ?? 5),
                      payload: generated.payload ?? {},
                      tags: Array.isArray(generated.tags) ? generated.tags : []
                    });
                    setP2Info(lang === "ru" ? "Сохранено в локальную базу задач" : "Saved to local tasks");
                  } catch (e: any) {
                    setP2Info(String(e?.message ?? e));
                  }
                }}
              >
                <Text style={styles.p2BtnText}>{lang === "ru" ? "Сохранить" : "Save"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.p2Btn2}
                onPress={() => {
                  if (generated.module_id === "physics") {
                    nav.navigate("PhysicsTask", { lessonBlockId: Number(generated.lesson_id), initialTaskId: String(generated.id) });
                  } else {
                    nav.navigate("ChemistryTask", { lessonId: Number(generated.lesson_id), taskIds: [String(generated.id)] });
                  }
                }}
              >
                <Text style={styles.p2BtnText}>{lang === "ru" ? "Открыть" : "Open"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View
        style={[
          styles.questionCard,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [34, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sectionLabel}>{t("ai_question")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("ai_placeholder")}
          placeholderTextColor="#6b7280"
          multiline
          value={question}
          onChangeText={setQuestion}
        />
        <TouchableOpacity
          style={[styles.askButton, loading && styles.askButtonDisabled]}
          onPress={onAsk}
          disabled={loading}
        >
          <Text style={styles.askButtonText}>{loading ? t("ai_thinking") : t("ai_ask")}</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          styles.answerContainer,
          {
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.answerHeaderRow}>
          <Text style={styles.sectionLabel}>{t("ai_answer")}</Text>
          {source && (
            <View style={[styles.badge, source === "online" ? styles.badgeOnline : styles.badgeOffline]}>
              <Text style={styles.badgeText}>{source === "online" ? "Online" : "Offline"}</Text>
            </View>
          )}
        </View>
        <ScrollView style={styles.answerScroll}>
          <Text style={styles.answerText}>{answer || (lang === "ru" ? "Ответ появится здесь." : "Answer will appear here.")}</Text>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050816", paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#e5e7eb" },
  subtitle: { marginTop: 4, color: "#9ca3af", fontSize: 13 },
  chipsRow: { flexDirection: "row", marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#1f2937", marginRight: 8, backgroundColor: "rgba(15,23,42,0.7)" },
  chipActive: { borderColor: "#7c3aed", backgroundColor: "rgba(76,29,149,0.8)" },
  chipText: { fontSize: 12, color: "#9ca3af" },
  chipTextActive: { color: "#e5e7eb", fontWeight: "600" },
  toggleRow: { marginBottom: 12 },
  toggle: { flexDirection: "row", alignItems: "center" },
  toggleActive: {},
  toggleKnobWrapper: { width: 38, height: 22, borderRadius: 11, backgroundColor: "#111827", borderWidth: 1, borderColor: "#374151", marginRight: 8, justifyContent: "center" },
  toggleKnob: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#4b5563", marginLeft: 4 },
  toggleKnobOn: { backgroundColor: "#22c55e", marginLeft: 18 },
  toggleText: { fontSize: 12, color: "#9ca3af" },
  questionCard: { backgroundColor: "#020617", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#1f2937", marginBottom: 12 },
  sectionLabel: { fontSize: 13, color: "#a5b4fc", marginBottom: 8, fontWeight: "600" },
  input: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    color: "#ffffff",
    fontSize: 14,
    backgroundColor: "#020617",
    fontFamily: "sans-serif",
    textAlignVertical: "top",
  },
  askButton: { marginTop: 10, backgroundColor: "#4c1d95", borderRadius: 999, paddingVertical: 10, alignItems: "center", justifyContent: "center", shadowColor: "#22d3ee", shadowOpacity: 0.4, shadowRadius: 10, elevation: 3 },
  askButtonDisabled: { opacity: 0.6 },
  askButtonText: { color: "#e0f2fe", fontWeight: "600", fontSize: 14 },
  answerContainer: { flex: 1, backgroundColor: "#020617", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#1f2937" },
  answerHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  answerScroll: { marginTop: 8 },
  answerText: { color: "#e5e7eb", fontSize: 14, lineHeight: 20 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOnline: { backgroundColor: "rgba(34,197,94,0.2)" },
  badgeOffline: { backgroundColor: "rgba(56,189,248,0.16)" },
  badgeText: { fontSize: 11, color: "#e5e7eb" },

  p2Card: { backgroundColor: "#020617", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#1f2937", marginBottom: 12 },
  p2Row: { flexDirection: "row", gap: 10 },
  p2Btn: { flex: 1, backgroundColor: "rgba(34,197,94,0.18)", borderRadius: 999, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.35)" },
  p2Btn2: { flex: 1, backgroundColor: "rgba(56,189,248,0.14)", borderRadius: 999, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(56,189,248,0.30)" },
  p2BtnText: { color: "#e5e7eb", fontWeight: "700", fontSize: 12 },
  p2Info: { color: "#9ca3af", marginTop: 10, fontSize: 12 },
  p2Result: { marginTop: 10, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.04)" },
  p2Title: { color: "#e5e7eb", fontWeight: "900" },
  p2Desc: { color: "#cbd5e1", marginTop: 6, fontSize: 12, lineHeight: 16 },
  p2Meta: { color: "#9ca3af", marginTop: 8, fontSize: 11, lineHeight: 15 },
  p2OpenBtn: { marginTop: 10, backgroundColor: "rgba(124,58,237,0.22)", borderWidth: 1, borderColor: "rgba(124,58,237,0.35)", borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  p2OpenText: { color: "#e5e7eb", fontWeight: "800" },

});

export default AIMentorScreen;
