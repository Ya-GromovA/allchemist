import React, { useMemo, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { UserRole, useAppSession } from "@app/state/AppSession";
import { trackEvent } from "@app/services/telemetryService";

const ADMIN_UI_URL = "http://91.197.99.201:8000/api/v1/admin/web";
const USER_WEB_URL = "http://91.197.99.201:8000/api/v1/web";

const RIGHTS_SLOGANS = [
  "Сделано с ❤ для управления знаниями.",
  "Учитесь глубже. Думайте смелее. Действуйте точнее.",
  "Знания сегодня - возможности завтра.",
  "Технологии, которые помогают учиться каждый день.",
];

const FOOTER_SECTIONS = [
  "Продукт",
  "Возможности",
  "Скриншоты",
  "Тарифы",
  "Скачать",
  "Ресурсы",
  "FAQ",
  "Changelog",
  "Поддержка",
  "Сообщество",
  "Telegram-канал",
  "Чат сообщества",
  "Правовая информация",
  "Конфиденциальность",
  "Условия",
  "Оферта",
  "Контакты",
];

type RoleCard = {
  title: string;
  subtitle: string;
  firstDayPlan: string[];
};

type WebMvpTopic = {
  id: string;
  grade: "8 класс" | "9 класс" | "10 класс";
  title: string;
  format: string;
  readiness: "готово к прототипу" | "в реализации";
  nextStep: string;
};

const WEB_MVP_TOPICS: WebMvpTopic[] = [
  {
    id: "chem-balance",
    grade: "8 класс",
    title: "Химические уравнения и балансировка",
    format: "урок + 5 задач + разбор ошибок",
    readiness: "в реализации",
    nextStep: "добавить экран урока с прогрессом и чекпоинтами",
  },
  {
    id: "chem-ionic",
    grade: "9 класс",
    title: "Ионные реакции в растворах",
    format: "теория + интерактивный мини-квиз",
    readiness: "готово к прототипу",
    nextStep: "подключить банк задач уровня easy/medium",
  },
  {
    id: "phys-mechanics",
    grade: "10 класс",
    title: "Кинематика и динамика: базовый трек",
    format: "lesson path + контрольные шаги",
    readiness: "в реализации",
    nextStep: "добавить метрики completion и first-attempt accuracy",
  },
  {
    id: "bio-cell",
    grade: "9 класс",
    title: "Биология: клетка, органоиды и обмен веществ",
    format: "урок + мини-квиз + разбор типовых ошибок",
    readiness: "готово к прототипу",
    nextStep: "добавить интерактивные схемы и карточки терминов",
  },
];

const WEB_GRADES: Array<WebMvpTopic["grade"]> = ["8 класс", "9 класс", "10 класс"];

const ROLE_CARDS: Record<UserRole, RoleCard> = {
  student: {
    title: "Учащийся",
    subtitle: "Учебный трек, практика задач и мини-экзамен",
    firstDayPlan: [
      "Открыть урок и пройти теорию без пропусков",
      "Решить 5 задач с разбором ошибок",
      "Зафиксировать личный план до контрольной",
    ],
  },
  teacher: {
    title: "Учитель",
    subtitle: "Быстрая подготовка урока и контроль прогресса класса",
    firstDayPlan: [
      "Выбрать тему и выдать задание группе",
      "Запустить онлайн-демонстрацию на уроке",
      "Проверить зоны риска в аналитике класса",
    ],
  },
  homeroom_teacher: {
    title: "Классный руководитель",
    subtitle: "Сводка класса, риски и связь с родителями",
    firstDayPlan: [
      "Проверить активность класса за неделю",
      "Отметить учащихся в зоне риска",
      "Подготовить короткую сводку для родителей",
    ],
  },
  parent: {
    title: "Родитель",
    subtitle: "Короткий ежедневный контроль без перегруза",
    firstDayPlan: [
      "Посмотреть прогресс ребенка за день",
      "Выбрать 20-минутный план повторения",
      "Проверить, нет ли критичных пробелов",
    ],
  },
};

export default function WebFallbackShell() {
  const { userId, role, onboardingDone, completeOnboarding } = useAppSession();
  const [selectedRole, setSelectedRole] = useState<UserRole>(role ?? "student");
  const [saving, setSaving] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<WebMvpTopic["grade"]>("9 класс");
  const [selectedTopicId, setSelectedTopicId] = useState<string>(WEB_MVP_TOPICS[1]?.id || WEB_MVP_TOPICS[0]?.id || "");

  const activeRole = onboardingDone && role ? role : selectedRole;
  const activeCard = useMemo(() => ROLE_CARDS[activeRole], [activeRole]);
  const gradeTopics = useMemo(
    () => WEB_MVP_TOPICS.filter((topic) => topic.grade === selectedGrade),
    [selectedGrade],
  );
  const activeTopic = useMemo(() => {
    const byId = gradeTopics.find((topic) => topic.id === selectedTopicId);
    if (byId) return byId;
    return gradeTopics[0] || WEB_MVP_TOPICS[0] || null;
  }, [gradeTopics, selectedTopicId]);
  const slogan = useMemo(() => {
    const day = new Date().getUTCDate();
    return RIGHTS_SLOGANS[day % RIGHTS_SLOGANS.length];
  }, []);

  const openUrl = async (url: string) => {
    if (Platform.OS === "web") {
      window.open(url, "_blank");
      return;
    }
    await Linking.openURL(url);
  };

  const completeRoleOnboarding = async () => {
    setSaving(true);
    try {
      await completeOnboarding(selectedRole);
      await trackEvent({
        name: "web_onboarding_role_selected",
        userId,
        role: selectedRole,
        payload: { surface: "web_preview_shell" },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Алхимик: веб-кабинет</Text>
      <Text style={styles.subtitle}>
        Веб-контур включён в основной план. Здесь доступны быстрый старт, учебные сценарии и ссылки на кабинеты.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1) Выберите рабочий профиль</Text>
        <Text style={styles.cardNote}>Это персонализирует сценарий первого запуска в вебе.</Text>
        <View style={styles.roleRow}>
          {(["student", "teacher", "homeroom_teacher", "parent"] as UserRole[]).map((nextRole) => {
            const active = selectedRole === nextRole;
            return (
              <Pressable
                key={nextRole}
                onPress={() => setSelectedRole(nextRole)}
                style={[styles.roleChip, active && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{ROLE_CARDS[nextRole].title}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={[styles.primaryBtn, saving && styles.disabledBtn]} onPress={completeRoleOnboarding} disabled={saving}>
          <Text style={styles.primaryBtnText}>{saving ? "Сохраняю..." : "Подтвердить профиль"}</Text>
        </Pressable>
        <Text style={styles.statusText}>
          Статус: {onboardingDone ? "профиль применен" : "профиль еще не подтвержден"}
          {onboardingDone && role ? " (" + ROLE_CARDS[role].title + ")" : ""}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2) План первого дня: {activeCard.title}</Text>
        <Text style={styles.cardNote}>{activeCard.subtitle}</Text>
        {activeCard.firstDayPlan.map((step) => (
          <Text key={step} style={styles.planItem}>- {step}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>3) Trust-слой и прозрачность</Text>
        <Text style={styles.trustText}>Источник: локальная база Алхимик (content packs)</Text>
        <Text style={styles.trustText}>Последнее обновление: 2026-02-25</Text>
        <Text style={styles.trustText}>Уверенность: 0.86 (внутренний рейтинг модели)</Text>
        <Text style={styles.cardNote}>Цель: одинаковая прозрачность в веб-кабинете и мобильном приложении.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>4) Полезные ссылки</Text>
        <View style={styles.actionsRow}>
          <Pressable style={styles.linkBtn} onPress={() => openUrl(USER_WEB_URL)}>
            <Text style={styles.linkBtnText}>Открыть веб-кабинет</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={() => openUrl(ADMIN_UI_URL)}>
            <Text style={styles.linkBtnText}>Открыть Web Admin</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>5) Каталог веб-уроков</Text>
        <Text style={styles.cardNote}>Шаг product-track: каркас для уроков и задач по химии/физике с фокусом на Sprint 2-3.</Text>
        <View style={styles.gradeRow}>
          {WEB_GRADES.map((grade) => {
            const active = selectedGrade === grade;
            return (
              <Pressable
                key={grade}
                onPress={() => {
                  setSelectedGrade(grade);
                  const first = WEB_MVP_TOPICS.find((topic) => topic.grade === grade);
                  if (first) setSelectedTopicId(first.id);
                }}
                style={[styles.gradeChip, active && styles.gradeChipActive]}
              >
                <Text style={[styles.gradeChipText, active && styles.gradeChipTextActive]}>{grade}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.topicList}>
          {gradeTopics.map((topic) => {
            const active = activeTopic?.id === topic.id;
            return (
              <Pressable key={topic.id} onPress={() => setSelectedTopicId(topic.id)} style={[styles.topicItem, active && styles.topicItemActive]}>
                <Text style={[styles.topicTitle, active && styles.topicTitleActive]}>{topic.title}</Text>
                <Text style={styles.topicMeta}>{topic.format}</Text>
              </Pressable>
            );
          })}
        </View>
        {activeTopic ? (
          <View style={styles.topicFocus}>
            <Text style={styles.topicFocusTitle}>Текущий фокус: {activeTopic.title}</Text>
            <Text style={styles.topicFocusText}>Статус: {activeTopic.readiness}</Text>
            <Text style={styles.topicFocusText}>Следующий шаг: {activeTopic.nextStep}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>6) Прогресс продуктового трека</Text>
        <Text style={styles.progressItem}>Сделано: вход по роли, базовые операции и блок доверия.</Text>
        <Text style={styles.progressItem}>Дальше: полноценные веб-экраны уроков, задач, аналитики и AI-наставника.</Text>
      </View>

      <View style={styles.siteInfoPanel}>
        <View style={styles.siteInfoGlow} />
        <Text style={styles.siteInfoLead}>Информация о продукте и ресурсах</Text>
        <View style={styles.rightsBadge}>
          <Text style={styles.rightsMain}>© 2026 Алхимик. Все права защищены.</Text>
          <Text style={styles.rightsSlogan}>{slogan}</Text>
        </View>
        <View style={styles.footerSectionsWrap}>
          {FOOTER_SECTIONS.map((label) => (
            <Text key={label} style={styles.footerSectionPill}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#071023",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    color: "#e6eefc",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9db1d5",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f355b",
    backgroundColor: "#0a1630",
    padding: 14,
  },
  cardTitle: {
    color: "#f8fbff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardNote: {
    color: "#9eb2d4",
    fontSize: 13,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  roleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2f4c7d",
    backgroundColor: "#0d1b34",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roleChipActive: {
    borderColor: "#5ea2ff",
    backgroundColor: "rgba(94,162,255,0.2)",
  },
  roleChipText: {
    color: "#cad8f2",
    fontSize: 12,
    fontWeight: "700",
  },
  roleChipTextActive: {
    color: "#e8f2ff",
  },
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: "#2166ff",
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  statusText: {
    color: "#89a4cf",
    fontSize: 12,
  },
  planItem: {
    color: "#d9e6ff",
    fontSize: 13,
    marginBottom: 4,
  },
  trustText: {
    color: "#d6e3ff",
    fontSize: 13,
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3f6296",
    backgroundColor: "#132647",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  linkBtnText: {
    color: "#e0ebff",
    fontSize: 13,
    fontWeight: "700",
  },
  gradeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  gradeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#35558a",
    backgroundColor: "#102447",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gradeChipActive: {
    borderColor: "#6bc8ff",
    backgroundColor: "rgba(45, 160, 255, 0.2)",
  },
  gradeChipText: {
    color: "#c8dbff",
    fontSize: 12,
    fontWeight: "700",
  },
  gradeChipTextActive: {
    color: "#edf6ff",
  },
  topicList: {
    gap: 8,
  },
  topicItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#29436d",
    backgroundColor: "#0d1d3b",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  topicItemActive: {
    borderColor: "#6bc8ff",
    backgroundColor: "rgba(45, 160, 255, 0.16)",
  },
  topicTitle: {
    color: "#e4eeff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  topicTitleActive: {
    color: "#ffffff",
  },
  topicMeta: {
    color: "#9fb8df",
    fontSize: 12,
  },
  topicFocus: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(107, 200, 255, 0.35)",
    backgroundColor: "rgba(11, 29, 57, 0.92)",
    padding: 10,
  },
  topicFocusTitle: {
    color: "#edf6ff",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  topicFocusText: {
    color: "#bfd7fb",
    fontSize: 12,
    marginBottom: 2,
  },
  progressItem: {
    color: "#d7e2f5",
    fontSize: 13,
    marginBottom: 4,
  },
  siteInfoPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.35)",
    backgroundColor: "#091833",
    padding: 14,
    marginTop: 4,
    marginBottom: 2,
    overflow: "hidden",
  },
  siteInfoGlow: {
    position: "absolute",
    right: -52,
    top: -48,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(56, 189, 248, 0.17)",
  },
  siteInfoLead: {
    color: "#d4e6ff",
    fontSize: 13,
    marginBottom: 10,
    fontWeight: "600",
  },
  rightsBadge: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.26)",
    backgroundColor: "rgba(15, 36, 66, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rightsMain: {
    fontSize: 12,
    color: "#e5efff",
    fontWeight: "800",
  },
  rightsSlogan: {
    marginTop: 3,
    fontSize: 11,
    color: "#b9d7ff",
  },
  footerSectionsWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  footerSectionPill: {
    fontSize: 10,
    color: "rgba(220, 235, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.24)",
    borderRadius: 999,
    backgroundColor: "rgba(16, 38, 68, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
