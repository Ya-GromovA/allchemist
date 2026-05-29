import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@app/theme/colors";

type Props = { navigation: any };

const biologyHero = require("../../assets/images/module_biology.png");

const learningFlow = [
  { step: "1", title: "Теория", text: "Клетка, органоиды, функции и признаки процесса." },
  { step: "2", title: "Практика", text: "Подписи к схеме, термины и короткие задания." },
  { step: "3", title: "Микроскоп", text: "Увеличение, слои препарата и наблюдение органоидов." },
  { step: "4", title: "Тест", text: "Проверка понятий и причинно-следственных связей." },
  { step: "5", title: "AI", text: "Разбор ошибки и план повторения по слабой теме." },
];

export default function BiologyScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Image source={biologyHero} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroOverlay} />
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>Учебный маршрут</Text>
          <Text style={styles.title}>Биология: клетка и микроскоп</Text>
          <Text style={styles.subtitle}>Теория, практика, виртуальный микроскоп, тест и AI-разбор идут одним последовательным экраном.</Text>
        </View>
      </View>

      <View style={styles.flowCard}>
        {learningFlow.map((item, index) => (
          <View key={item.step} style={styles.flowRow}>
            <View style={styles.stepBadge}><Text style={styles.stepText}>{item.step}</Text></View>
            <View style={styles.flowBody}>
              <Text style={styles.flowTitle}>{item.title}</Text>
              <Text style={styles.flowText}>{item.text}</Text>
            </View>
            {index < learningFlow.length - 1 ? <View style={styles.connector} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.microscopeCard}>
        <Text style={styles.cardTitle}>Виртуальный микроскоп</Text>
        <Text style={styles.cardText}>Ученик рассматривает препарат, отмечает ядро, мембрану и цитоплазму, затем отвечает на контрольный вопрос и получает подсказку.</Text>
        <View style={styles.microscopeStage}>
          <View style={styles.cellOuter}>
            <View style={styles.cellInner} />
            <View style={styles.cellNucleus} />
          </View>
          <Text style={styles.stageLabel}>Увеличение x400</Text>
        </View>
      </View>

      <Pressable
        style={styles.button}
        onPress={() =>
          navigation.navigate("AIMentor", {
            initialSubject: "biology",
            initialQuestion: "Объясни ошибку в теме клетка и составь план повторения",
          })
        }
      >
        <Text style={styles.buttonText}>Открыть AI-разбор по биологии</Text>
      </Pressable>

      <Pressable style={styles.buttonGhost} onPress={() => navigation.navigate("Analytics", { initialModule: "biology" })}>
        <Text style={styles.buttonGhostText}>Посмотреть прогресс по биологии</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    minHeight: 250,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.card,
    marginBottom: 14,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 12, 24, 0.58)",
  },
  heroText: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  flowCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 14,
  },
  flowRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 14,
    position: "relative",
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(51,195,255,0.18)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  stepText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  flowBody: {
    flex: 1,
  },
  flowTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  flowText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  connector: {
    position: "absolute",
    left: 16,
    top: 38,
    bottom: 4,
    width: 1,
    backgroundColor: colors.border,
  },
  microscopeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(51,195,255,0.28)",
    backgroundColor: "rgba(10, 31, 47, 0.72)",
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  microscopeStage: {
    height: 150,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.48)",
  },
  cellOuter: {
    width: 112,
    height: 82,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "rgba(134,239,172,0.74)",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
  },
  cellInner: {
    position: "absolute",
    width: 78,
    height: 54,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.66)",
  },
  cellNucleus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(244,114,182,0.82)",
  },
  stageLabel: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  button: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(51,195,255,0.16)",
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  buttonGhost: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  buttonGhostText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});
