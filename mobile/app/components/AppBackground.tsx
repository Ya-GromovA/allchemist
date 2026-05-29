import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { useAppSession } from "@app/state/AppSession";

/**
 * Декоративный фон в стиле иконки (неон/глубокий космос).
 *
 * ВАЖНО:
 * - pointerEvents="none", чтобы не блокировать клики
 * - без зависимостей (градиенты рисуем слоями)
 */
export default function AppBackground() {
  const { theme } = useAppSession();
  const palette = themePalettes[theme] ?? themePalettes.graphite;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.base, { backgroundColor: palette.base }]} />
      <Image source={require("../../assets/fon.png")} style={styles.backdrop} resizeMode="cover" />
      <View style={[styles.blob, styles.blob1, { backgroundColor: palette.blob1, opacity: palette.blobOpacity - 0.08 }]} />
      <View style={[styles.blob, styles.blob2, { backgroundColor: palette.blob2, opacity: palette.blobOpacity - 0.12 }]} />
      <Image source={require("../../assets/allchemist.png")} style={styles.alchemistWatermark} resizeMode="contain" />
      <View style={[styles.haze, { backgroundColor: palette.haze }]} />
    </View>
  );
}

const themePalettes = {
  graphite: {
    base: "#0b1220",
    blob1: "#1d4ed8",
    blob2: "#0ea5e9",
    blob3: "#312e81",
    stripe: "rgba(148, 163, 184, 0.10)",
    dot: "rgba(125, 211, 252, 0.20)",
    haze: "rgba(255,255,255,0.03)",
    blobOpacity: 0.26,
  },
  paper: {
    base: "#f8fafc",
    blob1: "#f59e0b",
    blob2: "#38bdf8",
    blob3: "#22c55e",
    stripe: "rgba(15, 23, 42, 0.05)",
    dot: "rgba(15, 23, 42, 0.12)",
    haze: "rgba(255,255,255,0.01)",
    blobOpacity: 0.18,
  },
  sunrise: {
    base: "#fff7ed",
    blob1: "#fb7185",
    blob2: "#f59e0b",
    blob3: "#0ea5e9",
    stripe: "rgba(127, 29, 29, 0.05)",
    dot: "rgba(124, 45, 18, 0.14)",
    haze: "rgba(255,255,255,0.02)",
    blobOpacity: 0.2,
  },
  aurora: {
    base: "#ecfeff",
    blob1: "#14b8a6",
    blob2: "#60a5fa",
    blob3: "#a78bfa",
    stripe: "rgba(15, 23, 42, 0.06)",
    dot: "rgba(14, 116, 144, 0.16)",
    haze: "rgba(255,255,255,0.01)",
    blobOpacity: 0.2,
  },
} as const;

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b1220",
  },

  blob: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.28,
  },

  blob1: {
    width: 320,
    height: 320,
    left: -120,
    top: -80,
    backgroundColor: "#1d4ed8",
  },
  blob2: {
    width: 420,
    height: 420,
    right: -180,
    top: 120,
    backgroundColor: "#0ea5e9",
    opacity: 0.18,
  },
  blob3: {
    width: 360,
    height: 360,
    left: 40,
    bottom: -160,
    backgroundColor: "#312e81",
    opacity: 0.12,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.24,
  },
  alchemistWatermark: {
    position: "absolute",
    right: -20,
    bottom: -10,
    width: 210,
    height: 210,
    opacity: 0.12,
  },
  haze: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
});
