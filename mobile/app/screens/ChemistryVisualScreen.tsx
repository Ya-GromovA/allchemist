import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

import type { RootStackParamList } from "@app/navigation/RootNavigator";
import { colors } from "@app/theme/colors";

export default function ChemistryVisualScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "ChemistryVisual">>();
  const { topicTitle, visuals, theoryMode, grade, bookLabel } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>{topicTitle}</Text>
        <Text style={styles.meta}>{theoryMode === "bookline" ? bookLabel : `${grade ?? "8"} класс • базовая теория`}</Text>
        <Text style={styles.text}>Это первый экран для C1: здесь собираем, какие иллюстрации, схемы и визуальные шаги должны сопровождать тему, чтобы теория не была только текстом.</Text>
      </View>

      {visuals.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.card}>
          <Text style={styles.cardTitle}>{index + 1}. {item}</Text>
          <Text style={styles.cardText}>Здесь должен появиться визуальный блок по теме: схема, карточка, иллюстрация или анимационный шаг, связанный именно с текущим объяснением.</Text>
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>Место под схему / иллюстрацию</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.24)",
    backgroundColor: "rgba(20,18,12,0.88)",
    padding: 14,
    marginBottom: 12,
  },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "900" },
  meta: { color: "#fcd34d", marginTop: 8, fontSize: 12, fontWeight: "800" },
  text: { color: colors.textSecondary, marginTop: 8, lineHeight: 19 },
  card: { marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.card, padding: 12 },
  cardTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 14 },
  cardText: { color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
  placeholderBox: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(125,211,252,0.28)",
    backgroundColor: "rgba(7,18,47,0.3)",
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: colors.textMuted, fontSize: 12 },
});
