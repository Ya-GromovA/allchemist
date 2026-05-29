import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { colors } from "@app/theme/colors";
import { useI18n } from "@app/i18n";

type IconName = "home" | "cabinet" | "report" | "ai";

function labelFor(routeName: string, lang: "ru" | "en") {
  if (routeName === "Home") return lang === "ru" ? "Главная" : "Home";
  if (routeName === "Cabinet") return lang === "ru" ? "Кабинет" : "Cabinet";
  if (routeName === "Analytics") return lang === "ru" ? "Отчет" : "Report";
  if (routeName === "AIMentor") return "AI";
  return routeName;
}

function iconFor(routeName: string): IconName {
  if (routeName === "Home") return "home";
  if (routeName === "Cabinet") return "cabinet";
  if (routeName === "Analytics") return "report";
  return "ai";
}

function TabIcon({ name, color }: { name: IconName; color: string }) {
  // 24x24 viewBox
  if (name === "home") {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 10.7L12 3.5l9 7.2V20a1.5 1.5 0 0 1-1.5 1.5H15a.5.5 0 0 1-.5-.5v-6.2a1.5 1.5 0 0 0-1.5-1.5h-2a1.5 1.5 0 0 0-1.5 1.5V21a.5.5 0 0 1-.5.5H4.5A1.5 1.5 0 0 1 3 20v-9.3z"
          stroke={color}
          strokeWidth={1.9}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === "cabinet") {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 12.2a4.1 4.1 0 1 0-4.1-4.1A4.1 4.1 0 0 0 12 12.2z"
          stroke={color}
          strokeWidth={1.9}
        />
        <Path
          d="M4.5 20.4c1.4-3.6 4.1-5.4 7.5-5.4s6.1 1.8 7.5 5.4"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (name === "report") {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M5 20V10" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
        <Path d="M10 20V6" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
        <Path d="M15 20v-8" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
        <Path d="M20 20v-5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
        <Path d="M4 20h17" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      </Svg>
    );
  }

  // ai
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.2 14.4c2.6-4.9 4.6-6.8 6.8-6.8 2.2 0 3.7 1.5 3.7 3.7 0 2.5-2 5-5.5 5-1.4 0-2.7-.4-5-.9z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Path d="M5.2 19.5l2.2-2.2" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M18.8 4.5l-2.2 2.2" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export default function AnimatedTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const tabW = useMemo(() => {
    const n = Math.max(1, state.routes.length);
    return barWidth > 0 ? barWidth / n : 0;
  }, [barWidth, state.routes.length]);

  const x = useSharedValue(0);

  useEffect(() => {
    if (!tabW) return;
    x.value = withTiming(state.index * tabW, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [state.index, tabW, x]);

  const onLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const w = Math.max(0, tabW - 14);
    return {
      width: w,
      transform: [{ translateX: x.value + 7 }],
    };
  }, [tabW]);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(14, insets.bottom + 10) }]} onLayout={onLayout}>
      <View style={styles.bar}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {state.routes.map((route, idx) => {
          const focused = state.index === idx;
          const options = descriptors[route.key]?.options ?? {};
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
              ? options.title
              : labelFor(route.name, lang);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              label={String(label)}
              icon={iconFor(route.name)}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const p = useSharedValue(focused ? 1 : 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, {
      damping: 14,
      stiffness: 160,
      mass: 0.75,
    });
  }, [focused, p]);

  useEffect(() => {
    if (!focused) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [focused, pulse]);

  const itemStyle = useAnimatedStyle(() => {
    const ty = interpolate(p.value, [0, 1], [0, -2]);
    return { transform: [{ translateY: ty }] };
  });

  const iconStyle = useAnimatedStyle(() => {
    const s = interpolate(p.value, [0, 1], [0.98, 1.06]);
    return { transform: [{ scale: s }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    const o = interpolate(p.value, [0, 1], [0, 1]);
    const ps = interpolate(pulse.value, [0, 1], [1, 1.08]);
    const po = interpolate(pulse.value, [0, 1], [0.55, 1]);
    return { opacity: o * po, transform: [{ scale: ps }] };
  });

  const labelWrapStyle = useAnimatedStyle(() => {
    const o = interpolate(p.value, [0, 1], [0.72, 1]);
    const s = interpolate(p.value, [0, 1], [0.98, 1]);
    return { opacity: o, transform: [{ scale: s }] };
  });

  const color = focused ? colors.textPrimary : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
    >
      <Animated.View style={[styles.item, itemStyle]}>
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
          <Animated.View style={[styles.iconGlow, glowStyle]} />
          <Animated.View style={[styles.iconInner, iconStyle]}>
            <TabIcon name={icon} color={color} />
          </Animated.View>
        </View>

        <Animated.View style={labelWrapStyle}>
          <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "transparent",
  },
  bar: {
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(10,11,46,0.92)",
    borderWidth: 1,
    borderColor: "rgba(95,225,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  indicator: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    borderRadius: 16,
    backgroundColor: "rgba(51,195,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(51,195,255,0.22)",
  },

  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  item: { alignItems: "center", justifyContent: "center", gap: 6 },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.55)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.20)",
    overflow: "hidden",
  },
  iconWrapActive: {
    borderColor: "rgba(95,225,255,0.42)",
  },
  iconGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(51,195,255,0.20)",
  },
  iconInner: {
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    color: colors.textMuted,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.25,
  },
  labelActive: { color: colors.textPrimary },
});
