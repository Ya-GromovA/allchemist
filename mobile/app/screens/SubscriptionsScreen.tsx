import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AppBackground from "@app/components/AppBackground";
import { api, API_BASE_URL } from "@app/config/api";
import { fetchEntitlements } from "@app/services/accountSyncService";
import { useAppSession } from "@app/state/AppSession";
import { colors } from "@app/theme/colors";

type Provider = "yookassa" | "tbank" | "robokassa";

type PlanCard = {
  id: string;
  title: string;
  subtitle: string;
  priceRub: number;
  period: string;
  features: string[];
};

const PROVIDERS: Array<{ id: Provider; label: string }> = [
  { id: "yookassa", label: "YooKassa" },
  { id: "tbank", label: "T-Bank" },
  { id: "robokassa", label: "Robokassa" },
];

const PLANS: PlanCard[] = [
  {
    id: "free",
    title: "Базовый",
    subtitle: "Базовый доступ",
    priceRub: 0,
    period: "без ограничений по времени",
    features: [
      "базовые уроки и модули",
      "локальный AI-наставник",
      "стартовая аналитика прогресса",
    ],
  },
  {
    id: "plan:pro_monthly",
    title: "Премиум на месяц",
    subtitle: "Расширенный AI и практика",
    priceRub: 299,
    period: "в месяц",
    features: [
      "расширенные ответы AI и больше AI-квоты",
      "реакции и 3D-сценарии без урезаний",
      "приоритетные обновления контента",
    ],
  },
  {
    id: "plan:school_quarter",
    title: "Школьный пакет на четверть",
    subtitle: "Школьный пакет",
    priceRub: 790,
    period: "за 3 месяца",
    features: [
      "всё из Pro",
      "углублённые химия / физика / биология",
      "live-сценарии и расширенная аналитика",
    ],
  },
  {
    id: "plan:family_year",
    title: "Семейный доступ на год",
    subtitle: "Семейный доступ",
    priceRub: 2490,
    period: "в год",
    features: [
      "всё из школьного пакета на четверть",
      "длинный доступ без продления каждый месяц",
      "увеличенная AI-квота и семейный сценарий",
    ],
  },
];

function humanPlan(plan: string): string {
  switch (plan) {
    case "pro_monthly":
      return "Премиум на месяц";
    case "school_quarter":
      return "Школьный пакет на четверть";
    case "family_year":
      return "Семейный доступ на год";
    case "free":
      return "Базовый";
    default:
      return plan;
  }
}

export default function SubscriptionsScreen() {
  const { userId, accessToken } = useAppSession();
  const [provider, setProvider] = useState<Provider>("yookassa");
  const [currentPlans, setCurrentPlans] = useState<string[]>(["free"]);
  const [busyPlan, setBusyPlan] = useState<string>("");
  const [info, setInfo] = useState<string>("Загружаем права доступа...");

  useEffect(() => {
    (async () => {
      try {
        const ent = await fetchEntitlements(userId);
        const plans = Array.isArray(ent?.plans) && ent.plans.length ? ent.plans : ["free"];
        setCurrentPlans(plans);
        setInfo(`Активные планы: ${plans.map(humanPlan).join(", ")}`);
      } catch (e: any) {
        setInfo(`Не удалось загрузить текущие права: ${String(e?.message ?? e)}`);
      }
    })();
  }, [userId]);

  const priceNote = useMemo(() => {
    return accessToken
      ? "Оплата открывается через backend checkoutUrl. Для продакшена нужно подставить боевые merchant-ключи провайдеров."
      : "Для оплаты нужен вход по телефону: без access token backend checkout не откроется.";
  }, [accessToken]);

  const openCheckout = async (plan: PlanCard) => {
    if (plan.priceRub <= 0) {
      Alert.alert("Free", "Базовый план уже доступен без оплаты.");
      return;
    }
    if (!accessToken) {
      Alert.alert("Нужен вход", "Сначала войдите по номеру телефона, чтобы backend смог создать checkout.");
      return;
    }

    setBusyPlan(plan.id);
    try {
      const base = API_BASE_URL.replace(/\/api\/v1$/, "");
      const { data } = await api.post("/payments/create", {
        provider,
        moduleId: plan.id,
        amountRub: plan.priceRub,
        returnUrl: `${base}/api/v1/web`,
        idempotencyKey: `${userId}:${plan.id}`,
      });

      const checkoutUrl = String(data?.checkoutUrl ?? "").trim();
      if (!checkoutUrl) {
        throw new Error("checkoutUrl пустой");
      }

      setInfo(`Checkout создан: ${plan.title} через ${provider}`);
      await Linking.openURL(checkoutUrl);
    } catch (e: any) {
      Alert.alert("Не удалось создать оплату", String(e?.response?.data?.detail ?? e?.message ?? e));
    } finally {
      setBusyPlan("");
    }
  };

  return (
    <View style={styles.root}>
      <AppBackground />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Тарифы и подписка</Text>
        <Text style={styles.subtitle}>Базовый доступ остается бесплатным. Расширенные возможности отличаются наполнением и сроком действия.</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{info}</Text>
          <Text style={styles.statusSub}>{priceNote}</Text>
        </View>

        <Text style={styles.sectionTitle}>Платёжный провайдер</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map((item) => (
            <Pressable key={item.id} onPress={() => setProvider(item.id)} style={[styles.providerBtn, provider === item.id && styles.providerBtnActive]}>
              <Text style={[styles.providerText, provider === item.id && styles.providerTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {PLANS.map((plan) => {
          const normalizedPlans = currentPlans.map((x) => String(x));
          const isCurrent = plan.id === "free" ? normalizedPlans.includes("free") : normalizedPlans.includes(plan.id.replace("plan:", ""));
          const busy = busyPlan === plan.id;
          return (
            <View key={plan.id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
              <View style={styles.planHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
                </View>
                <View>
                  <Text style={styles.planPrice}>{plan.priceRub === 0 ? "0 ₽" : `${plan.priceRub} ₽`}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>

              {plan.features.map((feature) => (
                <Text key={feature} style={styles.featureItem}>- {feature}</Text>
              ))}

              <View style={styles.planFooter}>
                <Text style={styles.currentText}>{isCurrent ? "Текущий план" : "Можно подключить"}</Text>
                <Pressable disabled={busy || isCurrent} onPress={() => openCheckout(plan)} style={[styles.buyBtn, (busy || isCurrent) && styles.buyBtnDisabled]}>
                  <Text style={styles.buyBtnText}>{plan.priceRub === 0 ? "Доступно" : busy ? "Создаём checkout..." : isCurrent ? "Уже активно" : "Оплатить"}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: "transparent" },
  content: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 40 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  statusCard: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, marginBottom: 16 },
  statusText: { color: colors.textPrimary, fontWeight: "700", marginBottom: 6 },
  statusSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  providerBtn: { borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 8 },
  providerBtnActive: { borderColor: colors.accentSoft, backgroundColor: colors.cardElevated },
  providerText: { color: colors.textSecondary, fontWeight: "700", fontSize: 12 },
  providerTextActive: { color: colors.textPrimary },
  planCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, marginBottom: 12 },
  planCardActive: { borderColor: colors.accentSoft, backgroundColor: colors.cardElevated },
  planHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  planTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "900" },
  planSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  planPrice: { color: colors.textPrimary, fontSize: 24, fontWeight: "900", textAlign: "right" },
  planPeriod: { color: colors.textMuted, fontSize: 11, textAlign: "right" },
  featureItem: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  planFooter: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  currentText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  buyBtn: { borderRadius: 999, borderWidth: 1, borderColor: "#1d4ed8", backgroundColor: colors.backgroundAlt, paddingHorizontal: 14, paddingVertical: 9 },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText: { color: colors.textPrimary, fontWeight: "800", fontSize: 12 },
});
