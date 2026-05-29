import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, TextInput, Alert, Linking } from "react-native";
import * as Application from "expo-application";
import { SvgXml } from "react-native-svg";
import QRCode from "qrcode";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppBackground from "@app/components/AppBackground";
import { colors } from "@app/theme/colors";
import { useI18n } from "@app/i18n";
import { getDeviceId } from "@app/services/deviceId";
import { API_BASE_URL, api } from "@app/config/api";
import { getNextTask } from "@app/services/aiMentorService";
import { uploadDeviceSnapshot } from "@app/services/accountSyncService";
import { contentUpdateService } from "@app/services/contentUpdateService";
import { syncProgressOnce } from "@app/services/syncProgressService";
import { loadReactionPrefs, saveReactionPrefs, type ReactionPrefs } from "@app/services/reactionPrefsService";
import { useAppSession } from "@app/state/AppSession";
import { changePassword } from "@app/services/authService";

type TeacherLiveStatus = {
  sessionId: string;
  status: "active" | "closed";
  title: string;
  moduleId: string;
  lessonId?: string | null;
  joinCode: string;
  joinUrl: string;
  updatedAt: string;
  totals: { studentsJoined: number; tasksTracked: number; highRiskCells: number };
  topicHeatmap?: Array<{ topic: string; ok: number; wrong: number; pending: number; riskScore: number; risk: string }>;
  classroomHeatmap?: Array<{ classroom: string; ok: number; wrong: number; pending: number; tasksTracked: number; riskScore: number; risk: string }>;
  mistakeTaxonomy?: Array<{ tag: string; correct: number; wrong: number; pending: number; total: number; riskScore: number; risk: string }>;
  rosterMap?: Array<{ classroom: string; expectedTotal: number; joinedTotal: number; matchedTotal: number; missingPreview: string[] }>;
  participants?: { participantsTotal: number; participantsPreview: Array<{ userId: string; role: string; classroom: string; joinedAt: string }> };
};

type AnalyticsResponse = {
  totals: { tasks_total: number; tasks_completed: number; progress_pct: number; avg_score_completed: number; last_active_utc: string | null };
  per_module: Array<{ module_id: string; tasks_total: number; tasks_completed: number; progress_pct: number; avg_score_completed: number; last_active_utc: string | null }>;
  skill_graph?: { recommend_next: string[] };
  lessons_report?: Array<{ lesson_id: number; module_id: string; title: string; risk: "low" | "medium" | "high"; progress_pct: number }>;
  learning_effectiveness?: {
    before: { attempts: number; completionRate: number; avgScore: number };
    after: { attempts: number; completionRate: number; avgScore: number };
    uplift: { completionRateDelta: number; avgScoreDelta: number };
    ab: { bucket: "A" | "B"; variant: string };
    integrity: { totalTaskEvents: number; tooFastAnswers: number; tooFastSharePct: number };
  };
  parent_insights?: {
    daily_plan?: Array<{ step: number; title: string; topic?: string; lesson?: string; prompt?: string; durationMin?: number }>;
    weekly_goal?: { targetTasks: number; targetCompletionPct: number; currentCompletionPct: number };
  };
  teacher_insights?: {
    intervention_queue?: Array<{ lessonId: number; moduleId: string; title: string; risk: string; reason: string }>;
    top_focus_topics?: Array<{ tag: string; count: number }>;
    recommended_live_tags?: string[];
  };
};

type ApkReleaseMetadata = {
  versionName: string;
  versionCode: number;
  releaseTitle?: string;
  releaseNotes?: string[];
  downloadUrl?: string;
  installAdviceRu?: string;
  debugReinstallNoticeRu?: string;
};

type ProfileSection = "account" | "security" | "offline" | "settings" | "help";

const THEME_OPTIONS = [
  { id: "graphite", label: "Тёмная" },
  { id: "paper", label: "Светлая" },
  { id: "sunrise", label: "Солнечная" },
  { id: "aurora", label: "Северное сияние" },
] as const;

const PERFORMANCE_OPTIONS = [
  { id: "lite", title: "Экономный", desc: "Бережет батарею, минимальная графика" },
  { id: "standard", title: "Сбалансированный", desc: "Рекомендуется для большинства устройств" },
  { id: "enhanced", title: "Максимальная плавность", desc: "Лучший визуал, выше нагрузка" },
] as const;

const TITLE_STYLE_OPTIONS = [
  { id: "standard", label: "Стандартный" },
  { id: "classic", label: "Классический" },
  { id: "accent", label: "Акцентный" },
] as const;

const PROFILE_SECTIONS: Array<{ id: ProfileSection; title: string; subtitle: string }> = [
  { id: "account", title: "Аккаунт", subtitle: "Роль, пароль и выход" },
  { id: "security", title: "Безопасность", subtitle: "Сеть, устройство, синхронизация" },
  { id: "offline", title: "Офлайн", subtitle: "Контент и обновления APK" },
  { id: "settings", title: "Настройки", subtitle: "Тема, заголовки, эффекты" },
  { id: "help", title: "Помощь", subtitle: "Что делать при проблемах" },
];

function roleLabelRu(role?: string | null) {
  if (role === "teacher") return "Учитель";
  if (role === "homeroom_teacher") return "Классный руководитель";
  if (role === "parent") return "Родитель";
  return "Учащийся";
}

export default function CabinetScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const stack = nav.getParent?.() ?? nav;
  const { lang, t } = useI18n();
  const {
    userId,
    role,
    appMode,
    networkMode,
    theme,
    titleStyle,
    setTheme,
    setTitleStyle,
    setAppMode,
    setNetworkMode,
    signOut,
  } = useAppSession();

  const currentPerformance = PERFORMANCE_OPTIONS.find((x) => x.id === appMode) ?? PERFORMANCE_OPTIONS[1];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [info, setInfo] = useState<string>("");
  const [lastRefreshAt, setLastRefreshAt] = useState<string>("");
  const [healthText, setHealthText] = useState<string>("Диагностика сети не выполнялась");

  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<TeacherLiveStatus | null>(null);
  const [liveQrSvg, setLiveQrSvg] = useState<string>("");
  const [liveBusy, setLiveBusy] = useState(false);

  const [rosterClassroom, setRosterClassroom] = useState("8A");
  const [rosterIdsInput, setRosterIdsInput] = useState("student_001\nstudent_002\nstudent_003");

  const [contentStatusText, setContentStatusText] = useState<string>("Контент: состояние не проверено");
  const [updateStatusText, setUpdateStatusText] = useState<string>("Версия приложения не проверялась");
  const [latestRelease, setLatestRelease] = useState<ApkReleaseMetadata | null>(null);
  const [reactionPrefs, setReactionPrefs] = useState<ReactionPrefs>({ hapticsEnabled: true, audioEnabled: true, narrationEnabled: true });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeProfileSection, setActiveProfileSection] = useState<ProfileSection>("account");

  const appVersion = Application.nativeApplicationVersion ?? "1.0.0";
  const appBuild = Number(Application.nativeBuildVersion ?? "1") || 1;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const res = await api.get(`/progress/analytics/${encodeURIComponent(deviceId)}`, {
        params: { lang, days: 30 },
        headers: { "X-Allow-Offline-Network": "1" },
      });
      setData(res.data as AnalyticsResponse);
      setLastRefreshAt(new Date().toLocaleString());
      if (networkMode !== "online") {
        await setNetworkMode("online");
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const code = e?.code;
      const msg = String(e?.message ?? e);
      setError(`Ошибка сети: ${msg}${status ? ` | HTTP ${status}` : ""}${code ? ` | ${code}` : ""}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    try {
      const [health, modules] = await Promise.all([
        api.get("/health", { timeout: 5000, headers: { "X-Allow-Offline-Network": "1" } }),
        api.get("/modules", { timeout: 7000, headers: { "X-Allow-Offline-Network": "1" } }),
      ]);
      const modulesCount = Array.isArray(modules?.data?.modules) ? modules.data.modules.length : 0;
      setHealthText(`Онлайн OK: /health ${health.status}, /modules ${modules.status}, модулей ${modulesCount}`);
    } catch (e: any) {
      const status = e?.response?.status;
      const code = e?.code;
      const msg = String(e?.message ?? e);
      setHealthText(`Сеть недоступна: ${msg}${status ? ` | HTTP ${status}` : ""}${code ? ` | ${code}` : ""}`);
    }
  };

  const checkAppUpdate = async () => {
    try {
      const res = await api.get("/content/downloads/apk/latest/metadata", {
        headers: { "X-Allow-Offline-Network": "1" },
      });
      const meta = res.data as ApkReleaseMetadata;
      setLatestRelease(meta);
      const latestCode = Number(meta.versionCode || 0);
      if (latestCode > appBuild) {
        setUpdateStatusText(`Доступна версия ${meta.versionName}. Установите APK поверх текущей версии, чтобы сохранить данные.`);
      } else {
        setUpdateStatusText(`Установлена актуальная версия ${appVersion} (${appBuild}).`);
      }
    } catch {
      setUpdateStatusText("Не удалось проверить обновление. Проверьте интернет.");
    }
  };

  const openLatestApk = async () => {
    const url = `${API_BASE_URL.replace(/\/api\/v1$/, "")}${latestRelease?.downloadUrl || "/api/v1/content/downloads/apk/latest"}`;
    await Linking.openURL(url);
  };

  useEffect(() => {
    load();
    runDiagnostics();
    checkAppUpdate();
  }, [lang]);

  useEffect(() => {
    (async () => {
      try {
        setReactionPrefs(await loadReactionPrefs());
      } catch {
        // keep defaults
      }
    })();
  }, []);

  const toggleReactionPref = async (key: keyof ReactionPrefs) => {
    const next = await saveReactionPrefs({ [key]: !reactionPrefs[key] });
    setReactionPrefs(next);
  };

  const buildQrSvg = async (payload: string) => {
    if (!payload) {
      setLiveQrSvg("");
      return;
    }
    try {
      const svg = await QRCode.toString(payload, {
        type: "svg",
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      });
      setLiveQrSvg(svg);
    } catch {
      setLiveQrSvg("");
    }
  };

  const refreshLive = async (sid?: string | null) => {
    const target = sid ?? liveSessionId;
    if (!target) return;
    try {
      const res = await api.get(`/cabinet/teacher/live/session/${encodeURIComponent(target)}`, {
        headers: { "X-Allow-Offline-Network": "1" },
      });
      const next = res.data as TeacherLiveStatus;
      setLiveStatus(next);
      await buildQrSvg(String(next?.joinUrl ?? next?.joinCode ?? ""));
    } catch (e: any) {
      setInfo(String(e?.message ?? e));
    }
  };

  const startLive = async () => {
    setLiveBusy(true);
    try {
      const res = await api.post("/cabinet/teacher/live/session/start?moduleId=chemistry&title=Live+урок+по+химии");
      const sid = String(res.data?.sessionId ?? "");
      if (!sid) throw new Error("live session id missing");
      setLiveSessionId(sid);
      await refreshLive(sid);
      setInfo(lang === "ru" ? "Live-сессия запущена. Поделись QR или join-кодом." : "Live session started.");
    } catch (e: any) {
      setInfo(String(e?.message ?? e));
    } finally {
      setLiveBusy(false);
    }
  };

  const closeLive = async () => {
    if (!liveSessionId) return;
    setLiveBusy(true);
    try {
      await api.post(`/cabinet/teacher/live/session/${encodeURIComponent(liveSessionId)}/close`);
      await refreshLive(liveSessionId);
    } catch (e: any) {
      setInfo(String(e?.message ?? e));
    } finally {
      setLiveBusy(false);
    }
  };

  const saveRoster = async () => {
    if (!liveSessionId) {
      setInfo("Сначала запустите live-сессию");
      return;
    }
    const ids = rosterIdsInput
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .join(",");
    if (!ids) {
      setInfo("Добавьте хотя бы одного учащегося");
      return;
    }
    try {
      await api.post(
        `/cabinet/teacher/live/session/${encodeURIComponent(liveSessionId)}/roster?classroom=${encodeURIComponent(rosterClassroom.trim() || "general")}&studentIds=${encodeURIComponent(ids)}`
      );
      await refreshLive(liveSessionId);
      setInfo(lang === "ru" ? "Roster сохранен" : "Roster saved");
    } catch (e: any) {
      setInfo(String(e?.message ?? e));
    }
  };

  const notifyRoster = async () => {
    if (!liveSessionId) {
      setInfo("Сначала запустите live-сессию");
      return;
    }
    try {
      const q = `classroom=${encodeURIComponent(rosterClassroom.trim() || "general")}&title=${encodeURIComponent("Новый live-урок")}&message=${encodeURIComponent("Откройте Алхимик и подключитесь к live")}`;
      const res = await api.post(`/cabinet/teacher/live/session/${encodeURIComponent(liveSessionId)}/notify?${q}`);
      setInfo(lang === "ru" ? `Push отправлен: ${res.data?.sent ?? 0}` : `Push sent: ${res.data?.sent ?? 0}`);
    } catch (e: any) {
      setInfo(String(e?.message ?? e));
    }
  };

  const syncCurrentDevice = async () => {
    try {
      const progressSync = await syncProgressOnce();
      await uploadDeviceSnapshot(userId, {
        contentVersions: { chemistry_core: "v1", physics_core: "v1" },
        purchases: ["chemistry_core"],
        preferences: { theme, appMode, networkMode, appVersion, appBuild },
      });
      const progressText = progressSync.ok ? `Прогресс отправлен: ${progressSync.pushed}.` : "Прогресс не отправлен, проверьте интернет.";
      Alert.alert("Готово", `${progressText} Снимок аккаунта сохранен. Можно переносить на новое устройство.`);
    } catch {
      Alert.alert("Ошибка", "Не удалось синхронизировать данные устройства.");
    }
  };

  const syncContentPacks = async () => {
    try {
      const packs = await contentUpdateService.listServerPacks();
      const result = await contentUpdateService.checkForUpdatesAndApply();
      setContentStatusText(`Контент: серверных пакетов ${packs.length}, обновлено ${result.updated.length}, актуально ${result.skipped.length}`);
    } catch {
      setContentStatusText("Контент: работаем с локальным офлайн-паком, обновление недоступно");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Выход", "Выйти из аккаунта на этом устройстве?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          await signOut();
          nav.reset({ index: 0, routes: [{ name: "Onboarding" }] });
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      Alert.alert("Заполните поля", "Введите текущий пароль, новый пароль и повтор.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert("Пароли не совпадают", "Повторите новый пароль ещё раз.");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword, newPasswordConfirm);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      Alert.alert("Готово", "Пароль изменён.");
    } catch (e: any) {
      Alert.alert("Не удалось сменить пароль", String(e?.response?.data?.detail || "Проверьте текущий пароль и требования к новому."));
    }
  };

  useEffect(() => {
    if (role !== "teacher" || !liveSessionId) return;
    refreshLive(liveSessionId);
    const timer = setInterval(() => refreshLive(liveSessionId), 5000);
    return () => clearInterval(timer);
  }, [role, liveSessionId]);

  const onContinue = async (moduleId: "physics" | "chemistry") => {
    setInfo("");
    try {
      const deviceId = await getDeviceId();
      const res = await getNextTask(deviceId, moduleId, lang);
      if (res?.found && res?.task) {
        const task = res.task;
        if (task.module_id === "physics") {
          stack.navigate?.("PhysicsTask", { lessonBlockId: Number(task.lesson_id), initialTaskId: String(task.id) });
          return;
        }
        if (task.module_id === "chemistry") {
          stack.navigate?.("ChemistryTask", { lessonId: Number(task.lesson_id), taskIds: [String(task.id)] });
          return;
        }
      }
      setInfo(res?.message ?? (lang === "ru" ? "Не удалось подобрать задачу" : "Cannot recommend"));
    } catch (e: any) {
      setInfo(String(e?.message ?? e));
    }
  };

  const nextTopics = useMemo(() => data?.skill_graph?.recommend_next ?? [], [data]);
  const highRiskLessons = useMemo(() => (data?.lessons_report ?? []).filter((x) => x.risk === "high").slice(0, 6), [data]);

  return (
    <View style={styles.root}>
      <AppBackground />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: Math.max(32, insets.bottom + 80), paddingHorizontal: 16 }}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t("cabinet_title")}</Text>
          <Text style={styles.heroSub}>{lang === "ru" ? "Личный кабинет и настройки приложения." : "Personal cabinet and app settings."}</Text>
          <Text style={styles.heroSub}>Текущая роль: {roleLabelRu(role)}</Text>
          {role !== "teacher" ? <Text style={styles.smallMuted}>Код онлайн-урока генерируется только в роли учителя.</Text> : null}
          {!!lastRefreshAt && <Text style={styles.heroSub}>Последнее обновление: {lastRefreshAt}</Text>}
          <Pressable onPress={async () => { await load(); await runDiagnostics(); }} style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.92 }]}>
            <Text style={styles.refreshText}>{lang === "ru" ? "Обновить" : "Refresh"}</Text>
          </Pressable>
          <Pressable onPress={runDiagnostics} style={({ pressed }) => [styles.refreshBtn, { marginTop: 8, backgroundColor: "rgba(20,184,166,0.2)", borderColor: "rgba(45,212,191,0.35)" }, pressed && { opacity: 0.92 }] }>
            <Text style={styles.refreshText}>Проверить сеть</Text>
          </Pressable>
          <Text style={styles.smallMuted}>{healthText}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Профиль</Text>
          <Text style={styles.cardText}>Разделы профиля собраны внутри одной вкладки, чтобы нижнее меню оставалось коротким.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs} contentContainerStyle={styles.sectionTabsContent}>
            {PROFILE_SECTIONS.map((item) => (
              <Pressable key={item.id} onPress={() => setActiveProfileSection(item.id)} style={[styles.sectionTab, activeProfileSection === item.id && styles.sectionTabActive]}>
                <Text style={[styles.sectionTabText, activeProfileSection === item.id && styles.sectionTabTextActive]}>{item.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.smallMuted}>{PROFILE_SECTIONS.find((x) => x.id === activeProfileSection)?.subtitle}</Text>

          {activeProfileSection === "account" ? (
            <View style={styles.profileSectionBody}>
              <Text style={styles.sectionLabel}>Аккаунт</Text>
              <Text style={styles.cardText}>Роль кабинета: {roleLabelRu(role)}</Text>
              <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Текущий пароль" placeholderTextColor="#6b7280" style={styles.input} secureTextEntry={!showPassword} />
              <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Новый пароль" placeholderTextColor="#6b7280" style={styles.input} secureTextEntry={!showPassword} />
              <Text style={styles.smallMuted}>Пароль: минимум 8 символов, буквы и цифры.</Text>
              <TextInput value={newPasswordConfirm} onChangeText={setNewPasswordConfirm} placeholder="Повторите новый пароль" placeholderTextColor="#6b7280" style={styles.input} secureTextEntry={!showPassword} />
              <View style={styles.moduleBtns}>
                <Pressable onPress={() => setShowPassword((x) => !x)} style={styles.btn2}><Text style={styles.btnText}>{showPassword ? "Скрыть пароль" : "Показать пароль"}</Text></Pressable>
                <Pressable onPress={handleChangePassword} style={styles.btn2}><Text style={styles.btnText}>Сменить пароль</Text></Pressable>
                <Pressable onPress={() => nav.navigate("Subscriptions")} style={styles.btn2}><Text style={styles.btnText}>Доступ и тарифы</Text></Pressable>
                <Pressable onPress={handleSignOut} style={styles.btn3}><Text style={styles.btnText}>Выйти</Text></Pressable>
              </View>
            </View>
          ) : null}

          {activeProfileSection === "security" ? (
            <View style={styles.profileSectionBody}>
              <Text style={styles.sectionLabel}>Безопасность</Text>
              <Text style={styles.cardText}>{healthText}</Text>
              <View style={styles.moduleBtns}>
                <Pressable onPress={runDiagnostics} style={styles.btn2}><Text style={styles.btnText}>Проверить сеть</Text></Pressable>
                <Pressable onPress={syncCurrentDevice} style={styles.btn2}><Text style={styles.btnText}>Синхронизировать устройство</Text></Pressable>
              </View>
              <Text style={styles.smallMuted}>Если доступы не появились после смены устройства, выполните синхронизацию и войдите по логину ещё раз.</Text>
            </View>
          ) : null}

          {activeProfileSection === "offline" ? (
            <View style={styles.profileSectionBody}>
              <Text style={styles.sectionLabel}>Офлайн</Text>
              <Text style={styles.cardText}>{updateStatusText}</Text>
              {latestRelease?.releaseNotes?.length ? (
                <View style={styles.lessonChip}>
                  <Text style={styles.lessonChipText}>{latestRelease.releaseTitle || `Версия ${latestRelease.versionName}`}</Text>
                  {latestRelease.releaseNotes.slice(0, 5).map((note) => <Text key={note} style={styles.lessonChipMeta}>• {note}</Text>)}
                </View>
              ) : null}
              <View style={styles.moduleBtns}>
                <Pressable onPress={checkAppUpdate} style={styles.btn2}><Text style={styles.btnText}>Проверить версию</Text></Pressable>
                {latestRelease && Number(latestRelease.versionCode || 0) > appBuild ? (
                  <Pressable onPress={openLatestApk} style={styles.btn3}><Text style={styles.btnText}>Скачать обновление</Text></Pressable>
                ) : null}
                <Pressable onPress={syncContentPacks} style={styles.btn2}><Text style={styles.btnText}>Обновить материалы</Text></Pressable>
              </View>
              <Text style={styles.smallMuted}>{contentStatusText}</Text>
              <Text style={styles.smallMuted}>Обновляйте приложение поверх старой версии. Перед удалением приложения выполните синхронизацию устройства.</Text>
            </View>
          ) : null}

          {activeProfileSection === "settings" ? (
            <View style={styles.profileSectionBody}>
              <Text style={styles.sectionLabel}>Оформление</Text>
              <View style={styles.moduleBtns}>
                {THEME_OPTIONS.map((item) => (
                  <Pressable key={item.id} onPress={() => setTheme(item.id)} style={[styles.btn2, theme === item.id && styles.btnSelected]}>
                    <Text style={styles.btnText}>{theme === item.id ? "✓ " : ""}{item.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionLabel}>Стиль заголовков</Text>
              <View style={styles.moduleBtns}>
                {TITLE_STYLE_OPTIONS.map((item) => (
                  <Pressable key={item.id} onPress={() => setTitleStyle(item.id)} style={[styles.btn2, titleStyle === item.id && styles.btnSelected]}>
                    <Text style={styles.btnText}>{titleStyle === item.id ? "✓ " : ""}{item.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionLabel}>Подключение</Text>
              <View style={styles.moduleBtns}>
                {(["online", "offline"] as const).map((m) => (
                  <Pressable key={m} onPress={() => setNetworkMode(m)} style={[styles.btn2, networkMode === m && styles.btnSelected]}>
                    <Text style={styles.btnText}>{networkMode === m ? "✓ " : ""}{m === "online" ? "Онлайн" : "Офлайн"}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionLabel}>Производительность</Text>
              <Text style={styles.cardText}>{currentPerformance.title}: {currentPerformance.desc}</Text>
              <View style={styles.moduleBtns}>
                {PERFORMANCE_OPTIONS.map((item) => (
                  <Pressable key={item.id} onPress={() => setAppMode(item.id)} style={[styles.btn2, appMode === item.id && styles.btnSelected]}>
                    <Text style={styles.btnText}>{appMode === item.id ? "✓ " : ""}{item.title}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.sectionLabel}>Эффекты реакций</Text>
              <View style={styles.moduleBtns}>
                <Pressable onPress={() => toggleReactionPref("narrationEnabled")} style={[styles.btn2, reactionPrefs.narrationEnabled && styles.btnSelected]}><Text style={styles.btnText}>{reactionPrefs.narrationEnabled ? "✓ " : ""}Пояснения</Text></Pressable>
                <Pressable onPress={() => toggleReactionPref("hapticsEnabled")} style={[styles.btn2, reactionPrefs.hapticsEnabled && styles.btnSelected]}><Text style={styles.btnText}>{reactionPrefs.hapticsEnabled ? "✓ " : ""}Вибрация</Text></Pressable>
                <Pressable onPress={() => toggleReactionPref("audioEnabled")} style={[styles.btn2, reactionPrefs.audioEnabled && styles.btnSelected]}><Text style={styles.btnText}>{reactionPrefs.audioEnabled ? "✓ " : ""}Звук</Text></Pressable>
              </View>
            </View>
          ) : null}

          {activeProfileSection === "help" ? (
            <View style={styles.profileSectionBody}>
              <Text style={styles.sectionLabel}>Помощь</Text>
              <Text style={styles.cardText}>Если не работает вход: проверьте логин и пароль, затем повторите вход по школьному коду только если он ещё не был активирован.</Text>
              <Text style={styles.cardText}>Если нет школьного доступа: попросите учителя или администратора выдать новый код.</Text>
              <Text style={styles.cardText}>Если приложение работает нестабильно: включите экономный профиль производительности и обновите материалы.</Text>
              <View style={styles.moduleBtns}>
                <Pressable onPress={runDiagnostics} style={styles.btn2}><Text style={styles.btnText}>Проверить сеть</Text></Pressable>
                <Pressable onPress={checkAppUpdate} style={styles.btn2}><Text style={styles.btnText}>Проверить версию</Text></Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accentSoft} /><Text style={styles.muted}>{lang === "ru" ? "Загрузка..." : "Loading..."}</Text></View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{lang === "ru" ? "Ошибка" : "Error"}</Text>
            <Text style={styles.cardText}>{error}</Text>
            <Text style={styles.cardText}>1) Нажмите "Проверить сеть"</Text>
            <Text style={styles.cardText}>2) Убедитесь, что мобильный интернет включен и сервер доступен</Text>
            <Text style={styles.cardText}>3) Если выбрана роль учителя: код онлайн-урока генерируется кнопкой "Запустить онлайн-урок"</Text>
          </View>
        ) : !data ? (
          <Text style={styles.muted}>{lang === "ru" ? "Нет данных." : "No data."}</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Прогресс</Text>
              <Text style={styles.cardText}>Выполнено: {data.totals.tasks_completed}/{data.totals.tasks_total} ({data.totals.progress_pct}%)</Text>
              <Text style={styles.cardText}>Средний балл: {data.totals.avg_score_completed}</Text>
              <Text style={styles.cardText}>Последняя активность: {data.totals.last_active_utc ?? "-"}</Text>
            </View>

            {role === "parent" ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>План дня для родителя</Text>
                <Text style={styles.cardText}>1) {lang === "ru" ? "10-15 минут: повтор слабой темы" : "10-15 min weak topic review"}: {nextTopics[0] ?? "general"}</Text>
                <Text style={styles.cardText}>2) {lang === "ru" ? "Решить 5 задач по уроку риска" : "Solve 5 tasks in risk lesson"}: {highRiskLessons[0]?.title ?? "next lesson"}</Text>
                <Text style={styles.cardText}>3) {lang === "ru" ? "Мини-рефлексия: где была основная ошибка" : "Reflection: where was main mistake"}</Text>
                {data.learning_effectiveness ? (
                    <Text style={styles.cardText}>
                      {lang === "ru" ? `Динамика: балл ${Math.round(data.learning_effectiveness.uplift.avgScoreDelta * 100)} п.п., завершение ${Math.round(data.learning_effectiveness.uplift.completionRateDelta * 100)} п.п.` : `Trend: score ${Math.round(data.learning_effectiveness.uplift.avgScoreDelta * 100)}pp, completion ${Math.round(data.learning_effectiveness.uplift.completionRateDelta * 100)}pp`}
                    </Text>
                ) : null}
                {(data.parent_insights?.daily_plan ?? []).map((step) => (
                  <Text key={`pi-${step.step}`} style={styles.cardText}>{step.step}) {step.title}: {step.topic ?? step.lesson ?? step.prompt ?? "-"} ({step.durationMin ?? 10} мин)</Text>
                ))}
              </View>
            ) : null}

            {role === "teacher" || role === "homeroom_teacher" ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Очередь вмешательств учителя</Text>
                {(data.teacher_insights?.intervention_queue ?? []).length === 0 ? (
                  <Text style={styles.cardText}>Очередь пустая</Text>
                ) : (
                  (data.teacher_insights?.intervention_queue ?? []).slice(0, 6).map((item) => (
                    <View key={`ti-${item.lessonId}-${item.moduleId}`} style={styles.lessonChip}>
                      <Text style={styles.lessonChipText}>{item.title} ({item.moduleId}) • риск {item.risk}</Text>
                      <Text style={styles.lessonChipMeta}>{item.reason}</Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Направления" : "Modules"}</Text>
              {(data.per_module ?? []).map((m) => {
                const mid = m.module_id as any;
                const title = mid === "physics" ? (lang === "ru" ? "Физика" : "Physics") : mid === "chemistry" ? (lang === "ru" ? "Химия" : "Chemistry") : m.module_id;
                return (
                  <View key={m.module_id} style={styles.moduleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.moduleTitle}>{title}</Text>
                      <Text style={styles.smallMuted}>{m.tasks_completed}/{m.tasks_total} • {m.progress_pct}% • ср.балл {m.avg_score_completed}</Text>
                    </View>
                    <View style={styles.moduleBtns}>
                      {(mid === "physics" || mid === "chemistry") && <Pressable onPress={() => onContinue(mid)} style={styles.btn}><Text style={styles.btnText}>{lang === "ru" ? "Продолжить" : "Continue"}</Text></Pressable>}
                      <Pressable onPress={() => nav.navigate("Analytics", { initialModule: mid === "physics" || mid === "chemistry" ? mid : undefined })} style={styles.btn2}><Text style={styles.btnText}>{lang === "ru" ? "Отчет" : "Report"}</Text></Pressable>
                    </View>
                  </View>
                );
              })}
              {!!info && <Text style={styles.cardText}>{info}</Text>}
            </View>

            {role === "teacher" ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Онлайн-урок в реальном времени</Text>
                {!liveSessionId ? (
                  <Pressable onPress={startLive} disabled={liveBusy} style={styles.btn3}><Text style={styles.btnText}>{liveBusy ? "Запуск..." : "Запустить онлайн-урок"}</Text></Pressable>
                ) : (
                  <>
                      <Text style={styles.cardText}>Сессия: {liveSessionId}</Text>
                      <Text style={styles.cardText}>Код входа: {liveStatus?.joinCode ?? "..."}</Text>
                      <Text style={styles.cardText}>Участники: {liveStatus?.participants?.participantsTotal ?? 0}</Text>
                      <Text style={styles.cardText}>Учеников: {liveStatus?.totals?.studentsJoined ?? 0} • Высокий риск: {liveStatus?.totals?.highRiskCells ?? 0}</Text>

                    <View style={styles.lessonChip}>
                      <Text style={styles.lessonChipText}>QR для онлайн-урока</Text>
                      {liveQrSvg ? <SvgXml xml={liveQrSvg} width={170} height={170} /> : <Text style={styles.lessonChipMeta}>QR создается...</Text>}
                      <Text style={styles.lessonChipMeta}>{liveStatus?.joinUrl ?? ""}</Text>
                    </View>

                    <View style={styles.lessonChip}>
                      <Text style={styles.lessonChipText}>Редактор списка класса</Text>
                      <TextInput value={rosterClassroom} onChangeText={setRosterClassroom} placeholder="Класс (8A)" placeholderTextColor={colors.textMuted} style={styles.input} />
                      <TextInput value={rosterIdsInput} onChangeText={setRosterIdsInput} placeholder="student_001\nstudent_002" multiline numberOfLines={4} placeholderTextColor={colors.textMuted} style={[styles.input, { minHeight: 88 }]} />
                      <View style={styles.moduleBtns}>
                        <Pressable onPress={saveRoster} style={styles.btn2}><Text style={styles.btnText}>Сохранить список</Text></Pressable>
                        <Pressable onPress={notifyRoster} style={styles.btn2}><Text style={styles.btnText}>Отправить push классу</Text></Pressable>
                        <Pressable onPress={() => refreshLive(liveSessionId)} style={styles.btn2}><Text style={styles.btnText}>Обновить live</Text></Pressable>
                        <Pressable onPress={closeLive} style={styles.btn3}><Text style={styles.btnText}>Закрыть live</Text></Pressable>
                      </View>
                    </View>

                    {(liveStatus?.topicHeatmap ?? []).slice(0, 3).map((row) => (
                      <View key={row.topic} style={styles.lessonChip}>
                        <Text style={styles.lessonChipText}>{row.topic}: риск {Math.round(row.riskScore * 100)}%</Text>
                        <Text style={styles.lessonChipMeta}>верно {row.ok} / ошибки {row.wrong} / ожидает {row.pending}</Text>
                      </View>
                    ))}

                    {(liveStatus?.classroomHeatmap ?? []).slice(0, 4).map((row) => (
                      <View key={row.classroom} style={styles.lessonChip}>
                        <Text style={styles.lessonChipText}>Класс {row.classroom}: риск {Math.round(row.riskScore * 100)}%</Text>
                        <Text style={styles.lessonChipMeta}>верно {row.ok} / ошибки {row.wrong} / ожидает {row.pending} / задач {row.tasksTracked}</Text>
                      </View>
                    ))}

                    {(liveStatus?.mistakeTaxonomy ?? []).slice(0, 5).map((row) => (
                      <View key={row.tag} style={styles.lessonChip}>
                        <Text style={styles.lessonChipText}>Ошибка: {row.tag} ({Math.round(row.riskScore * 100)}%)</Text>
                        <Text style={styles.lessonChipMeta}>верно {row.correct} / ошибки {row.wrong} / ожидает {row.pending}</Text>
                      </View>
                    ))}

                    {(liveStatus?.rosterMap ?? []).slice(0, 4).map((row) => (
                      <View key={row.classroom + "-roster"} style={styles.lessonChip}>
                        <Text style={styles.lessonChipText}>Список {row.classroom}: подключилось {row.joinedTotal}/{row.expectedTotal || row.joinedTotal}</Text>
                        <Text style={styles.lessonChipMeta}>совпало {row.matchedTotal} | отсутствуют {row.missingPreview.length ? row.missingPreview.join(", ") : "нет"}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Рекомендуемые темы" : "Recommended topics"}</Text>
              <Text style={styles.cardText}>{nextTopics.length ? nextTopics.join(", ") : (lang === "ru" ? "Пока пусто." : "Empty.")}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{lang === "ru" ? "Уроки в риске" : "Risk lessons"}</Text>
              {highRiskLessons.length === 0 ? (
                <Text style={styles.cardText}>{lang === "ru" ? "Пока нет." : "None."}</Text>
              ) : (
                highRiskLessons.map((l) => (
                  <View key={String(l.lesson_id)} style={styles.lessonChip}>
                    <Text style={styles.lessonChipText}>{l.title}</Text>
                    <Text style={styles.lessonChipMeta}>{l.module_id} • {l.progress_pct}%</Text>
                  </View>
                ))
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
  container: { flex: 1 },
  hero: { borderRadius: 22, borderWidth: 1, borderColor: "rgba(95,225,255,0.22)", backgroundColor: "rgba(10,11,46,0.92)", padding: 16 },
  heroTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 24 },
  heroSub: { marginTop: 8, color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
  refreshBtn: { marginTop: 12, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "rgba(51,195,255,0.14)", borderWidth: 1, borderColor: "rgba(51,195,255,0.24)" },
  refreshText: { color: colors.textPrimary, fontWeight: "900" },
  center: { marginTop: 18, alignItems: "center" },
  muted: { color: colors.textMuted, marginTop: 10, textAlign: "center" },
  smallMuted: { color: colors.textMuted, marginTop: 8, fontSize: 11 },
  card: { marginTop: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, padding: 14 },
  cardTitle: { color: colors.textPrimary, fontWeight: "900" },
  sectionTabs: { marginTop: 12 },
  sectionTabsContent: { gap: 8, paddingRight: 8 },
  sectionTab: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(31,108,255,0.10)" },
  sectionTabActive: { borderColor: "rgba(45,212,191,0.88)", backgroundColor: "rgba(45,212,191,0.22)" },
  sectionTabText: { color: colors.textSecondary, fontWeight: "800", fontSize: 12 },
  sectionTabTextActive: { color: colors.textPrimary },
  profileSectionBody: { marginTop: 10 },
  sectionLabel: { color: colors.textPrimary, fontWeight: "800", marginTop: 10, fontSize: 12 },
  cardText: { color: colors.textSecondary, marginTop: 8, fontSize: 12, lineHeight: 16 },
  moduleRow: { marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardElevated, padding: 12, gap: 10 },
  moduleTitle: { color: colors.textPrimary, fontWeight: "900" },
  moduleBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(34,197,94,0.14)", borderWidth: 1, borderColor: "rgba(34,197,94,0.24)" },
  btn2: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(31,108,255,0.16)", borderWidth: 1, borderColor: "rgba(31,108,255,0.26)" },
  btn3: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(51,195,255,0.14)", borderWidth: 1, borderColor: "rgba(51,195,255,0.22)" },
  btnSelected: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "rgba(45,212,191,0.22)", borderWidth: 2, borderColor: "rgba(45,212,191,0.88)" },
  btnText: { color: colors.textPrimary, fontWeight: "900", fontSize: 12 },
  lessonChip: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(248,113,113,0.20)", backgroundColor: "rgba(248,113,113,0.10)", padding: 12 },
  lessonChipText: { color: colors.textPrimary, fontWeight: "900" },
  lessonChipMeta: { marginTop: 6, color: colors.textMuted, fontSize: 11 },
  input: { borderRadius: 10, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.backgroundAlt, color: colors.textPrimary, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8 },
});
