import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  progress: number;
  finalBurst?: boolean;
  errorText?: string | null;
  onRetry?: () => void;
  onArtReady?: () => void;
};

const ASSET_W = 852;
const ASSET_H = 1846;

// Coordinates are percentages of the original 852x1846 artwork.
// If zagruzka.png changes, update these anchors against the new asset pixels.
const PROGRESS_BOX = { x: 0.194, y: 0.863, w: 0.606, h: 0.014 };
const FLASK_BOX = { x: 0.455, y: 0.742, w: 0.092, h: 0.057 };

const splashArt = require("../../assets/splash/zagruzka.png");

const bubbles = [
  { x: 0.22, delay: 0, size: 7, distance: 28 },
  { x: 0.42, delay: 260, size: 5, distance: 38 },
  { x: 0.58, delay: 520, size: 6, distance: 34 },
  { x: 0.72, delay: 780, size: 4, distance: 30 },
];

const clampProgress = (value: number) => Math.max(0, Math.min(value, 1));

export default function LaunchSplash({ progress, finalBurst = false, errorText, onRetry, onArtReady }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const appear = useSharedValue(0);
  const fill = useSharedValue(0);
  const boil = useSharedValue(0);
  const steam = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    boil.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, false);
    steam.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => {
      cancelAnimation(appear);
      cancelAnimation(boil);
      cancelAnimation(steam);
    };
  }, [appear, boil, steam]);

  useEffect(() => {
    fill.value = withTiming(clampProgress(progress), { duration: 520, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(fill);
  }, [fill, progress]);

  useEffect(() => {
    if (finalBurst) {
      burst.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    } else {
      burst.value = withTiming(0, { duration: 120 });
    }
    return () => cancelAnimation(burst);
  }, [burst, finalBurst]);

  const imageFrame = useMemo(() => {
    if (!size.width || !size.height) return { width: 0, height: 0, left: 0, top: 0 };
    // Preserve the full 852x1846 artwork so the embedded flask/progress anchors stay aligned.
    const scale = Math.min(size.width / ASSET_W, size.height / ASSET_H);
    const width = ASSET_W * scale;
    const height = ASSET_H * scale;
    return { width, height, left: (size.width - width) / 2, top: (size.height - height) / 2 };
  }, [size]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: appear.value }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(fill.value, [0, 1], [0, 100])}%`,
    opacity: interpolate(fill.value, [0, 1], [0.58, 1]),
  }));

  const progressShineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fill.value, [0, 0.18, 1], [0, 0.54, 0.82]),
    transform: [{ translateX: interpolate(boil.value, [0, 1], [-10, 18]) }],
  }));

  const flaskGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(boil.value, [0, 0.5, 1], [0.28, 0.62, 0.28]) + progress * 0.16,
    transform: [{ scale: interpolate(boil.value, [0, 0.5, 1], [0.92, 1.05, 0.92]) }],
  }));

  const steamStyle = useAnimatedStyle(() => ({
    opacity: interpolate(steam.value, [0, 0.45, 1], [0, 0.42 + progress * 0.22, 0]),
    transform: [{ translateY: interpolate(steam.value, [0, 1], [10, -26]) }, { scale: interpolate(steam.value, [0, 1], [0.88, 1.22]) }],
  }));

  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.25, 1], [0, 0.88, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.7, 2.4]) }],
  }));

  const progressFrame = {
    left: imageFrame.left + imageFrame.width * PROGRESS_BOX.x,
    top: imageFrame.top + imageFrame.height * PROGRESS_BOX.y,
    width: imageFrame.width * PROGRESS_BOX.w,
    height: imageFrame.height * PROGRESS_BOX.h,
  };
  const flaskFrame = {
    left: imageFrame.left + imageFrame.width * FLASK_BOX.x,
    top: imageFrame.top + imageFrame.height * FLASK_BOX.y,
    width: imageFrame.width * FLASK_BOX.w,
    height: imageFrame.height * FLASK_BOX.h,
  };

  return (
    <Animated.View style={[styles.root, rootStyle]} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {imageFrame.width > 0 ? (
        <>
          <Image source={splashArt} style={styles.art} resizeMode="contain" onLoad={onArtReady} />

          <View pointerEvents="none" style={[styles.progressMask, progressFrame]}>
            <Animated.View style={[styles.progressFill, progressFillStyle]}>
              <Animated.View style={[styles.progressShine, progressShineStyle]} />
            </Animated.View>
          </View>

          <View pointerEvents="none" style={[styles.flaskLayer, flaskFrame]}>
            <Animated.View style={[styles.flaskGlow, flaskGlowStyle]} />
            <Animated.View style={[styles.steam, steamStyle]} />
            <Animated.View style={[styles.burst, burstStyle]} />
            {bubbles.map((bubble, index) => (
              <Bubble key={index} {...bubble} progress={progress} />
            ))}
          </View>
        </>
      ) : null}

      {!!errorText && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Не удалось завершить запуск</Text>
          <Text style={styles.errorText}>{errorText}</Text>
          <Pressable onPress={onRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

function Bubble({ x, delay, size, distance, progress }: { x: number; delay: number; size: number; distance: number; progress: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1300 + delay * 0.2, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(p);
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.22, 1], [0, 0.42 + progress * 0.44, 0]),
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, -distance * (0.8 + progress * 0.45)]) }, { scale: interpolate(p.value, [0, 0.6, 1], [0.55, 1.15, 0.7]) }],
  }));
  return <Animated.View style={[styles.bubble, { left: `${x * 100}%`, bottom: "18%", width: size, height: size, borderRadius: size }, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070529", overflow: "hidden" },
  art: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  progressMask: {
    position: "absolute",
    zIndex: 1,
    overflow: "hidden",
    borderRadius: 999,
  },
  progressFill: {
    height: "100%",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(180, 92, 255, 0.76)",
    shadowColor: "#d8b4fe",
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 6,
  },
  progressShine: {
    position: "absolute",
    top: 1,
    bottom: 1,
    width: "34%",
    borderRadius: 999,
    backgroundColor: "rgba(255, 246, 255, 0.64)",
  },
  flaskLayer: { position: "absolute", zIndex: 1, alignItems: "center", justifyContent: "center" },
  flaskGlow: {
    position: "absolute",
    width: "78%",
    height: "58%",
    bottom: "12%",
    borderRadius: 999,
    backgroundColor: "rgba(180, 92, 255, 0.42)",
    shadowColor: "#d8b4fe",
    shadowOpacity: 0.9,
    shadowRadius: 18,
  },
  steam: {
    position: "absolute",
    top: "-16%",
    width: "60%",
    height: "48%",
    borderRadius: 999,
    backgroundColor: "rgba(230, 213, 255, 0.22)",
  },
  bubble: { position: "absolute", backgroundColor: "rgba(226, 232, 255, 0.85)" },
  burst: {
    position: "absolute",
    width: "62%",
    height: "62%",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    shadowColor: "#f5d0fe",
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  errorCard: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 58,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(13, 8, 45, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(216, 180, 254, 0.28)",
  },
  errorTitle: { color: "#ffffff", fontWeight: "900", fontSize: 16 },
  errorText: { color: "#ddd6fe", marginTop: 6, fontSize: 13, lineHeight: 18 },
  retryBtn: { marginTop: 12, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "rgba(168, 85, 247, 0.35)" },
  retryText: { color: "#ffffff", fontWeight: "800" },
});
