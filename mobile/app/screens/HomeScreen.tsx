import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import AppBackground from "@app/components/AppBackground";
import { colors } from "@app/theme/colors";
import { useAppSession } from "@app/state/AppSession";
import { api } from "@app/config/api";
import { saveActiveLiveSession } from "@app/services/liveSessionService";
import { trackLearningEvent } from "@app/services/learningEventService";

type DashboardRole = "student" | "teacher" | "homeroom_teacher" | "parent" | "school_admin" | "admin" | "owner";

type ActionCard = {
  title: string;
  text: string;
  action?: string;
  onPress?: () => void;
};

type SubjectCard = {
  title: string;
  text: string;
  image: ImageSourcePropType;
  icon: ImageSourcePropType;
  onPress: () => void;
};

const HERO_IMAGES: Record<string, ImageSourcePropType> = {
  student: require("../../assets/images/student_dashboard_hero.png"),
  teacher: require("../../assets/images/teacher_dashboard_hero.png"),
  homeroom_teacher: require("../../assets/images/teacher_dashboard_hero.png"),
  parent: require("../../assets/images/parent_dashboard_hero.png"),
};

const SUBJECT_IMAGES = {
  chemistry: require("../../assets/images/module_chemistry.png"),
  physics: require("../../assets/images/module_physics.png"),
  biology: require("../../assets/images/module_biology.png"),
  ai: require("../../assets/images/module_ai.png"),
};

const SUBJECT_ICONS = {
  chemistry: require("../../assets/icons/icon_chemistry.png"),
  physics: require("../../assets/icons/icon_physics.png"),
  biology: require("../../assets/icons/icon_biology.png"),
  ai: require("../../assets/icons/icon_ai.png"),
};

function useLocalClock() {
  const [value, setValue] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setValue(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return value.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function displayNameFromUserId(userId: string) {
  if (!userId || userId.startsWith("demo-user") || userId.startsWith("u_invite")) return "учащийся";
  return userId.replace(/[_-]+/g, " ").trim();
}

function roleLabel(role: string | null) {
  if (role === "teacher") return "Учитель";
  if (role === "homeroom_teacher") return "Классный руководитель";
  if (role === "parent") return "Родитель";
  if (role === "school_admin") return "Администратор школы";
  if (role === "admin") return "Администратор системы";
  if (role === "owner") return "Владелец";
  return "Учащийся";
}

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { userId, role, networkMode } = useAppSession();
  const clock = useLocalClock();
  const dashboardRole = ((role || "student") as DashboardRole) || "student";
  const [heroFailed, setHeroFailed] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [classroomCode, setClassroomCode] = useState("8A");
  const [aiQuestion, setAiQuestion] = useState("");

  const parentNav = navigation.getParent?.() ?? navigation;

  const openRoot = (route: string, params?: Record<string, unknown>) => {
    parentNav.navigate(route, params);
  };

  const openModule = (moduleId: "chemistry" | "physics" | "biology" | "ai") => {
    trackLearningEvent({ eventType: "module_open", userId, role: role ?? undefined, moduleId, outcome: "open", payload: { source: "role_dashboard" } });
    if (moduleId === "chemistry") return openRoot("Chemistry");
    if (moduleId === "physics") return openRoot("Physics");
    if (moduleId === "biology") return openRoot("Biology");
    return navigation.navigate("AIMentor", { initialSubject: "meta", initialQuestion: aiQuestion || undefined });
  };

  const joinLiveSessionByCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert("Нужен код", "Введите код live-урока от учителя.");
      return;
    }
    if (networkMode === "offline") {
      Alert.alert("Нужен интернет", "Для подключения к live-уроку переключитесь в онлайн-режим.");
      return;
    }
    try {
      const response = await api.post(
        `/cabinet/live/join?joinCode=${encodeURIComponent(joinCode.trim())}&classroom=${encodeURIComponent(classroomCode.trim() || "general")}`
      );
      const payload = response.data ?? {};
      await saveActiveLiveSession({
        sessionId: String(payload.sessionId ?? ""),
        joinCode: String(payload.joinCode ?? joinCode.trim()),
        moduleId: String(payload.moduleId ?? "chemistry"),
        lessonId: String(payload.lessonId ?? "general"),
        classroom: classroomCode.trim() || "general",
      });
      setJoinCode("");
      Alert.alert("Готово", `Подключение к live-уроку выполнено: ${payload?.title ?? "урок"}`);
    } catch {
      Alert.alert("Не удалось подключиться", "Проверьте код, класс и подключение к интернету.");
    }
  };

  const subjects: SubjectCard[] = useMemo(
    () => [
      { title: "Химия", text: "Теория, реакции, лабораторные, таблица элементов", image: SUBJECT_IMAGES.chemistry, icon: SUBJECT_ICONS.chemistry, onPress: () => openModule("chemistry") },
      { title: "Физика", text: "Симуляторы законов, формулы, графики и задачи", image: SUBJECT_IMAGES.physics, icon: SUBJECT_ICONS.physics, onPress: () => openModule("physics") },
      { title: "Биология", text: "Микроскоп, живые уровни, генетика и анатомия", image: SUBJECT_IMAGES.biology, icon: SUBJECT_ICONS.biology, onPress: () => openModule("biology") },
    ],
    [aiQuestion, role, userId]
  );

  const studentCards: ActionCard[] = [
    { title: "Главное сегодня", text: "Домашнее задание по химии: повторить строение атома. Срок: сегодня до 20:00.", action: "Начать", onPress: () => openRoot("ChemistryLessons") },
    { title: "Продолжить обучение", text: "Физика · Закон Ома · прогресс 42%", action: "Продолжить", onPress: () => openRoot("PhysicsLessons") },
    { title: "Подготовка к экзамену", text: "ОГЭ / ЕГЭ / МЦКО / ВПР: тренировка по слабым темам без повторов последних заданий.", action: "Тренироваться", onPress: () => navigation.navigate("Analytics") },
    { title: "Повторить слабое", text: "Молярная масса, уравнивание реакций, чтение графиков.", action: "Повторить", onPress: () => openRoot("ChemistryLessons") },
  ];

  const teacherCards: ActionCard[] = [
    { title: "Сегодня", text: "8А · Химия · 10:30 · Строение атома", action: "Открыть урок", onPress: () => navigation.navigate("Analytics", { initialModule: "chemistry" }) },
    { title: "Быстрые действия", text: "Собрать урок · Запустить демонстрацию · Начать live-урок · Выдать задание", action: "Открыть", onPress: () => navigation.navigate("Cabinet") },
    { title: "Проверка", text: "12 работ ждут проверки, 7 можно предварительно разобрать с AI.", action: "Открыть проверку", onPress: () => navigation.navigate("Cabinet") },
    { title: "Аналитика", text: "Слабые темы класса: валентность, графики, лабораторная безопасность.", action: "Смотреть", onPress: () => navigation.navigate("Analytics") },
  ];

  const parentCards: ActionCard[] = [
    { title: "Статус недели", text: "Есть риск: пропущены 2 задания, просадка по химии.", action: "Подробнее", onPress: () => navigation.navigate("Analytics") },
    { title: "Прогресс", text: "Химия 58% · Физика 71% · Биология 64%", action: "Открыть", onPress: () => navigation.navigate("Analytics") },
    { title: "Что важно", text: "Сегодня дедлайн по задаче. Проверенная работа по физике уже доступна.", action: "Смотреть", onPress: () => navigation.navigate("Analytics") },
    { title: "Рекомендация", text: "15–20 минут: повторить валентность и пройти 5 коротких заданий.", action: "План", onPress: () => navigation.navigate("Analytics") },
  ];

  const homeroomCards: ActionCard[] = [
    { title: "Класс 8А", text: "Всего 28 учащихся, активны сегодня 21, в зоне риска 4.", action: "Открыть класс", onPress: () => navigation.navigate("Analytics") },
    { title: "Риски", text: "Неактивны больше 7 дней: 3. Просроченные задания: 9.", action: "Разобрать", onPress: () => navigation.navigate("Analytics") },
    { title: "Просадки по предметам", text: "Химия: валентность. Физика: графики. Биология: клетка.", action: "Отчёт", onPress: () => navigation.navigate("Analytics") },
  ];

  const isTeacher = dashboardRole === "teacher";
  const isHomeroom = dashboardRole === "homeroom_teacher";
  const isParent = dashboardRole === "parent";
  const cards = isHomeroom ? homeroomCards : isTeacher ? teacherCards : isParent ? parentCards : studentCards;
  const hero = HERO_IMAGES[dashboardRole] ?? HERO_IMAGES.student;
  const name = displayNameFromUserId(userId);
  const title = isTeacher ? `Добрый день, ${name}` : isHomeroom ? "Класс 8А" : isParent ? "Иван: учебная неделя" : `Привет, ${name}`;
  const subtitle = isTeacher
    ? "Уроки, классы, проверка и аналитика в одном рабочем сценарии."
    : isHomeroom
    ? "Сводка класса, риски, активность и сигналы родителям."
    : isParent
    ? "Прогресс ребёнка, дедлайны, слабые темы и короткие рекомендации."
    : "Сегодняшние задачи, продолжение обучения, экзамены и быстрый вопрос AI.";

  return (
    <View style={styles.root}>
      <AppBackground />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View>
            <Text style={styles.role}>{roleLabel(role)}</Text>
            <Text style={styles.clock}>{clock}</Text>
          </View>
          <View style={styles.statusPill}><Text style={styles.statusText}>{networkMode === "offline" ? "Офлайн" : "Онлайн"}</Text></View>
        </View>

        <View style={styles.heroCard}>
          {!heroFailed ? <Image source={hero} style={styles.heroImage} resizeMode="cover" onError={() => setHeroFailed(true)} /> : <View style={styles.heroFallback}><Text style={styles.heroFallbackText}>Алхимик</Text></View>}
          <View style={styles.heroOverlay} />
          <View style={styles.heroText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isTeacher ? "Рабочий день" : isHomeroom ? "Сводка класса" : isParent ? "Главное по ребёнку" : "Главное сегодня"}</Text>
          <Text style={styles.sectionHint}>Что сделать прямо сейчас</Text>
        </View>

        {cards.map((card) => <DashboardCard key={card.title} {...card} />)}

        {!isParent && !isHomeroom ? (
          <>
            <Text style={styles.sectionTitle}>Мои предметы</Text>
            <View style={styles.subjectGrid}>{subjects.map((item) => <SubjectCardView key={item.title} item={item} />)}</View>
          </>
        ) : null}

        {!isTeacher && !isHomeroom ? (
          <View style={styles.aiCard}>
            <Image source={SUBJECT_ICONS.ai} style={styles.aiIcon} resizeMode="contain" />
            <View style={styles.aiContent}>
              <Text style={styles.cardTitle}>Спросить AI</Text>
              <Text style={styles.cardText}>AI онлайн. Можно попросить объяснить проще, подробнее или разобрать ошибку.</Text>
              <TextInput value={aiQuestion} onChangeText={setAiQuestion} placeholder="Например: объясни валентность" placeholderTextColor={colors.textMuted} style={styles.aiInput} />
              <Pressable style={styles.primaryButton} onPress={() => openModule("ai")}><Text style={styles.primaryButtonText}>Спросить AI</Text></Pressable>
            </View>
          </View>
        ) : null}

        {dashboardRole === "student" ? (
          <View style={styles.liveCard}>
            <Text style={styles.cardTitle}>Подключиться к live-уроку</Text>
            <Text style={styles.cardText}>Код работает только для подтверждённых учеников класса и ограничен по времени.</Text>
            <TextInput value={joinCode} onChangeText={setJoinCode} placeholder="Код урока" placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="characters" />
            <TextInput value={classroomCode} onChangeText={setClassroomCode} placeholder="Класс" placeholderTextColor={colors.textMuted} style={styles.input} />
            <Pressable onPress={joinLiveSessionByCode} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Войти в live</Text></Pressable>
          </View>
        ) : null}

        <View style={styles.offlineCard}>
          <Text style={styles.cardTitle}>Офлайн и память</Text>
          <Text style={styles.cardText}>Скачаны базовые метаданные и стартовые материалы. Полные темы, медиа и модели загружаются по запросу, чтобы не забивать телефон.</Text>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Cabinet")}><Text style={styles.secondaryButtonText}>Управлять в профиле</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function DashboardCard({ title, text, action, onPress }: ActionCard) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
      {action ? <Pressable onPress={onPress} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{action}</Text></Pressable> : null}
    </View>
  );
}

function SubjectCardView({ item }: { item: SubjectCard }) {
  const [failed, setFailed] = useState(false);
  return (
    <Pressable style={styles.subjectCard} onPress={item.onPress}>
      {!failed ? <Image source={item.image} style={styles.subjectImage} resizeMode="cover" onError={() => setFailed(true)} /> : <View style={styles.subjectFallback} />}
      <View style={styles.subjectShade} />
      <Image source={item.icon} style={styles.subjectIcon} resizeMode="contain" />
      <View style={styles.subjectText}>
        <Text style={styles.subjectTitle}>{item.title}</Text>
        <Text style={styles.subjectDesc}>{item.text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 120 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  role: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  clock: { color: colors.textPrimary, fontSize: 22, fontWeight: "900", marginTop: 2 },
  statusPill: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(125,211,252,0.35)", backgroundColor: "rgba(14,165,233,0.12)", paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { color: "#bae6fd", fontSize: 12, fontWeight: "800" },
  heroCard: { height: 218, borderRadius: 28, overflow: "hidden", marginBottom: 18, borderWidth: 1, borderColor: "rgba(125,211,252,0.22)", backgroundColor: "rgba(15,23,42,0.92)" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.44)" },
  heroFallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30,41,59,0.86)" },
  heroFallbackText: { color: colors.textPrimary, fontSize: 28, fontWeight: "900" },
  heroText: { position: "absolute", left: 18, right: 18, bottom: 18 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "900", lineHeight: 34 },
  subtitle: { color: "#dbeafe", fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 560 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: "900", marginBottom: 4 },
  sectionHint: { color: colors.textMuted, fontSize: 13 },
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(15,23,42,0.78)" },
  cardTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "900", marginBottom: 6 },
  cardText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  secondaryButton: { alignSelf: "flex-start", marginTop: 12, borderRadius: 999, borderWidth: 1, borderColor: "rgba(125,211,252,0.35)", paddingHorizontal: 13, paddingVertical: 8, backgroundColor: "rgba(15,23,42,0.7)" },
  secondaryButtonText: { color: "#e0f2fe", fontWeight: "900", fontSize: 12 },
  subjectGrid: { gap: 12, marginBottom: 16 },
  subjectCard: { height: 156, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(125,211,252,0.22)", backgroundColor: "rgba(15,23,42,0.76)" },
  subjectImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  subjectFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(30,41,59,0.9)" },
  subjectShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.42)" },
  subjectIcon: { position: "absolute", top: 14, right: 14, width: 46, height: 46 },
  subjectText: { position: "absolute", left: 16, right: 72, bottom: 16 },
  subjectTitle: { color: colors.textPrimary, fontSize: 23, fontWeight: "900" },
  subjectDesc: { color: "#dbeafe", fontSize: 13, lineHeight: 18, marginTop: 5 },
  aiCard: { flexDirection: "row", gap: 12, borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(168,85,247,0.35)", backgroundColor: "rgba(46,16,101,0.36)" },
  aiIcon: { width: 52, height: 52 },
  aiContent: { flex: 1 },
  aiInput: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(2,6,23,0.52)", color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 10 },
  liveCard: { borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(96,165,250,0.35)", backgroundColor: "rgba(30,64,175,0.22)" },
  input: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(2,6,23,0.52)", color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 10 },
  primaryButton: { alignSelf: "flex-start", marginTop: 12, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: "#2563eb" },
  primaryButtonText: { color: "white", fontWeight: "900", fontSize: 13 },
  offlineCard: { borderRadius: 22, padding: 14, borderWidth: 1, borderColor: "rgba(148,163,184,0.24)", backgroundColor: "rgba(15,23,42,0.72)" },
});
