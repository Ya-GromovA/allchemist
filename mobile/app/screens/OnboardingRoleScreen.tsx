import React, { useState } from "react";
import { Alert, View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";

import { UserRole, useAppSession } from "@app/state/AppSession";
import { trackEvent } from "@app/services/telemetryService";
import { activateInviteCode, loginWithPassword, previewInviteCode, requestPhoneCode, verifyPhoneCode } from "@app/services/authService";
import { api } from "@app/config/api";

type Props = { navigation: any };

type InvitePreview = Awaited<ReturnType<typeof previewInviteCode>>;

export const OnboardingRoleScreen: React.FC<Props> = ({ navigation }) => {
  const { completeOnboarding, userId, setUserIdentity, setAuthTokens, theme, appMode, networkMode } = useAppSession();
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accessLogin, setAccessLogin] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessPasswordConfirm, setAccessPasswordConfirm] = useState("");
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [invitePreviewLoading, setInvitePreviewLoading] = useState(false);

  const finishAuth = async (data: { userId: string; accessToken: string; refreshToken: string; role?: UserRole; activeRole?: UserRole }) => {
    const nextRole = data.activeRole ?? data.role ?? "student";
    await setUserIdentity(data.userId);
    await setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    await completeOnboarding(nextRole, data.userId);
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  const handleContinue = async () => {
    const role: UserRole = "student";
    if (saving) return;
    setSaving(true);
    try {
      try {
        await api.post("/users/consents/accept", {
          userId,
          role,
          version: "2026-02-28",
          parentApproved: role !== "student",
        });
      } catch {
        await trackEvent({
          name: "consent_sync_deferred",
          userId,
          role,
          payload: { reason: "offline_first_or_network" },
        });
      }

      await completeOnboarding(role);
      await trackEvent({
        name: "onboarding_completed",
        userId,
        role,
        payload: { flow: "guest_learning" },
      });
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestCode = async () => {
    if (!phone.trim()) return;
    await requestPhoneCode(phone.trim());
    Alert.alert("Код отправлен", "Проверь SMS на указанном номере.");
  };

  const handleLoginPassword = async () => {
    if (!login.trim() || !password) return Alert.alert("Введите логин и пароль", "Если у вас только школьный код, создайте аккаунт в блоке ниже.");
    try {
      const data = await loginWithPassword(login.trim(), password);
      await finishAuth(data);
    } catch (e: any) {
      Alert.alert("Не удалось войти", String(e?.response?.data?.detail || "Неверный логин или пароль."));
    }
  };

  const handleActivateInvite = async () => {
    if (!accessCode.trim() || !accessLogin.trim() || !accessPassword || !accessPasswordConfirm) {
      return Alert.alert("Заполните поля", "Нужны школьный код, логин, пароль и повтор пароля.");
    }
    if (accessPassword !== accessPasswordConfirm) return Alert.alert("Пароли не совпадают", "Повторите новый пароль ещё раз.");
    try {
      const data = await activateInviteCode({
        code: accessCode.trim().toUpperCase(),
        phone: phone.trim() || "+70000000000",
        displayName: displayName.trim() || undefined,
        login: accessLogin.trim(),
        password: accessPassword,
        passwordConfirm: accessPasswordConfirm,
      });
      await finishAuth(data);
    } catch (e: any) {
      Alert.alert("Код не активирован", String(e?.response?.data?.detail || "Проверьте код, логин и пароль."));
    }
  };

  const handlePreviewInvite = async () => {
    const normalizedCode = accessCode.trim().toUpperCase();
    if (!normalizedCode) return Alert.alert("Введите код доступа", "Проверьте персональный код от школы или учителя.");
    setInvitePreviewLoading(true);
    try {
      const data = await previewInviteCode(normalizedCode);
      setInvitePreview(data);
    } catch (e: any) {
      setInvitePreview(null);
      Alert.alert("Код не найден", String(e?.response?.data?.detail || "Проверьте код доступа."));
    } finally {
      setInvitePreviewLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!phone.trim() || !code.trim()) return;
    const data = await verifyPhoneCode(phone.trim(), code.trim(), {
      localUserId: userId,
      localPurchases: ["chemistry_core"],
      localContentVersions: { chemistry_core: "v1" },
      localPreferences: { theme, appMode, networkMode },
    });

    const role = data.activeRole ?? data.role ?? "student";
    await setUserIdentity(data.userId);
    await setAuthTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });

    try {
      await api.post("/users/consents/accept", {
        userId: data.userId,
        role,
        version: "2026-02-28",
        parentApproved: role !== "student",
      });
    } catch {
      // deferred until network is available
    }

    await trackEvent({
      name: "phone_sync_verified",
      userId: data.userId,
      payload: { phone: data.phone, role },
    });
    await completeOnboarding(role, data.userId);
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Добро пожаловать в Алхимик</Text>
      <Text style={styles.subtitle}>Войдите в аккаунт или активируйте школьный код. Роль кабинета определяется автоматически после входа.</Text>
      <Text style={styles.metaHint}>Код доступа используется один раз для создания логина и пароля.</Text>

      <View style={styles.scenarioGrid}>
        <Pressable style={styles.card} onPress={() => trackEvent({ name: "onboarding_scenario", userId, payload: { scenario: "learn" } })}>
          <Text style={styles.cardTitle}>Я учусь</Text>
          <Text style={styles.cardSubtitle}>Откройте учебный кабинет по логину или школьному коду.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => trackEvent({ name: "onboarding_scenario", userId, payload: { scenario: "teach" } })}>
          <Text style={styles.cardTitle}>Я учитель</Text>
          <Text style={styles.cardSubtitle}>Назначение учителя или классного руководителя проверит сервер.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => trackEvent({ name: "onboarding_scenario", userId, payload: { scenario: "parent" } })}>
          <Text style={styles.cardTitle}>Я родитель</Text>
          <Text style={styles.cardSubtitle}>Войдите, чтобы смотреть прогресс ребёнка и рекомендации.</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ваш кабинет откроется автоматически</Text>
        <Text style={styles.cardSubtitle}>Учащийся, учитель, классный руководитель или родитель видит только назначенный ему сценарий после проверки аккаунта.</Text>
      </View>

      <View style={styles.syncCard}>
        <Text style={styles.syncTitle}>Войти по логину и паролю</Text>
        <TextInput testID="login-input" value={login} onChangeText={setLogin} placeholder="Логин" placeholderTextColor="#6b7280" style={styles.input} autoCapitalize="none" />
        <View style={styles.passwordRow}>
          <TextInput testID="password-input" value={password} onChangeText={setPassword} placeholder="Пароль" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1, marginBottom: 0 }]} secureTextEntry={!showPassword} />
          <Pressable onPress={() => setShowPassword((x) => !x)} style={styles.smallBtn}><Text style={styles.smallBtnText}>{showPassword ? "Скрыть" : "Показать"}</Text></Pressable>
        </View>
        <Text style={styles.syncHint}>Если у вас только школьный код, создайте логин и пароль ниже.</Text>
        <Pressable testID="login-password-button" onPress={handleLoginPassword} style={[styles.smallBtn, { alignSelf: "flex-start", marginBottom: 10 }]}><Text style={styles.smallBtnText}>Войти по логину</Text></Pressable>

        <Text style={styles.syncTitle}>Школьный код</Text>
        <TextInput value={accessCode} onChangeText={(value) => { setAccessCode(value); setInvitePreview(null); }} placeholder="Например: STD-2070-NZ-0000" placeholderTextColor="#6b7280" style={styles.input} autoCapitalize="characters" />
        <Pressable onPress={handlePreviewInvite} style={[styles.smallBtn, { alignSelf: "flex-start", marginBottom: 10 }]} disabled={invitePreviewLoading}>
          <Text style={styles.smallBtnText}>{invitePreviewLoading ? "Проверяем..." : "Проверить код"}</Text>
        </Pressable>
        {invitePreview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>{invitePreview.messageRu}</Text>
            <Text style={styles.previewText}>Школа: {invitePreview.schoolTitle || "Школа"}</Text>
            <Text style={styles.previewText}>Площадка: {invitePreview.siteTitle || "Площадка"}</Text>
            <Text style={styles.previewText}>Класс: {invitePreview.classTitle || "Не указан"}</Text>
            <Text style={styles.previewText}>Роль: {invitePreview.roleLabelRu}</Text>
            <Text style={styles.previewText}>Доступ: {invitePreview.licenseTitle || "Школьная лицензия"}</Text>
            <Text style={styles.previewText}>Модули: {invitePreview.modulesLabelRu || "Базовый доступ"}</Text>
          </View>
        ) : null}
        <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Отображаемое имя" placeholderTextColor="#6b7280" style={styles.input} />
        <TextInput value={accessLogin} onChangeText={setAccessLogin} placeholder="Новый логин" placeholderTextColor="#6b7280" style={styles.input} autoCapitalize="none" />
        <View style={styles.passwordRow}>
          <TextInput value={accessPassword} onChangeText={setAccessPassword} placeholder="Новый пароль" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1, marginBottom: 0 }]} secureTextEntry={!showAccessPassword} />
          <Pressable onPress={() => setShowAccessPassword((x) => !x)} style={styles.smallBtn}><Text style={styles.smallBtnText}>{showAccessPassword ? "Скрыть" : "Показать"}</Text></Pressable>
        </View>
        <Text style={styles.syncHint}>Пароль: минимум 8 символов, буквы и цифры. Логин: 4-32 символа, латиница, цифры, _ или -.</Text>
        <TextInput value={accessPasswordConfirm} onChangeText={setAccessPasswordConfirm} placeholder="Повторите пароль" placeholderTextColor="#6b7280" style={styles.input} secureTextEntry={!showAccessPassword} />
        <Pressable onPress={handleActivateInvite} style={[styles.smallBtn, { alignSelf: "flex-start", marginBottom: 14 }]}><Text style={styles.smallBtnText}>Активировать школьный код</Text></Pressable>

        <Text style={styles.syncTitle}>Синхронизация по номеру телефона</Text>
        <Text style={styles.syncHint}>Нужна для переноса покупок и контента на другое устройство.</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+7 900 000 00 00"
          placeholderTextColor="#6b7280"
          style={styles.input}
          keyboardType="phone-pad"
        />
        <View style={styles.row}>
          <Pressable onPress={handleRequestCode} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Получить код</Text>
          </Pressable>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Код"
            placeholderTextColor="#6b7280"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            keyboardType="number-pad"
          />
          <Pressable onPress={handleVerifyCode} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Подтвердить</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={[styles.button, saving && { opacity: 0.7 }]} onPress={handleContinue} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Сохраняю..." : "Продолжить без входа"}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },
  contentContainer: {
    paddingTop: 84,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: { color: "#ffffff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#9ca3af", marginTop: 8, marginBottom: 20, fontSize: 14 },
  metaHint: { color: "#7dd3fc", marginBottom: 14, fontSize: 12 },
  scenarioGrid: { gap: 10, marginBottom: 10 },
  card: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27344f",
    backgroundColor: "#0b1324",
    padding: 14,
  },
  cardActive: {
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  cardTitle: { color: "#d1d5db", fontSize: 16, fontWeight: "700" },
  cardTitleActive: { color: "#ffffff" },
  cardSubtitle: { color: "#9ca3af", marginTop: 4 },
  syncCard: {
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2b3b58",
    backgroundColor: "#0a1326",
    padding: 12,
  },
  syncTitle: { color: "#e5e7eb", fontWeight: "700", marginBottom: 4 },
  syncHint: { color: "#9ca3af", fontSize: 12, marginBottom: 8 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2d3a57",
    backgroundColor: "#0a1020",
    color: "#ffffff",
    fontFamily: "sans-serif",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "rgba(37,99,235,0.12)",
    padding: 10,
    marginBottom: 10,
  },
  previewTitle: { color: "#dbeafe", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  previewText: { color: "#cbd5e1", fontSize: 12, marginTop: 2 },
  smallBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59,130,246,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallBtnText: { color: "#dbeafe", fontSize: 12, fontWeight: "700" },
  button: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});

export default OnboardingRoleScreen;
