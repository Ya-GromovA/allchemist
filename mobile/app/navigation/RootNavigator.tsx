import React, { useMemo } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { NavigationContainer, DarkTheme, NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";

import { useI18n } from "@app/i18n";

import MainTabs, { MainTabParamList } from "@app/navigation/MainTabs";

import PhysicsScreen from "@app/screens/PhysicsScreen";
import PhysicsLessonsScreen from "@app/screens/PhysicsLessonsScreen";
import PhysicsTaskScreen from "@app/screens/PhysicsTaskScreen";

import ChemistryScreen from "@app/screens/ChemistryScreen";
import ChemistryLessonsScreen from "@app/screens/ChemistryLessonsScreen";
import ChemistryTaskScreen from "@app/screens/ChemistryTaskScreen";
import ChemistryVisualScreen from "@app/screens/ChemistryVisualScreen";

import MoleculesGalleryScreen from "@app/screens/MoleculesGalleryScreen";
import MoleculeDetailScreen from "@app/screens/MoleculeDetailScreen";
import Reactions3DScreen from "@app/screens/Reactions3DScreen";
import PeriodicTableScreen from "@app/screens/PeriodicTableScreen";
import OnboardingRoleScreen from "@app/screens/OnboardingRoleScreen";
import BiologyScreen from "@app/screens/BiologyScreen";
import SubscriptionsScreen from "@app/screens/SubscriptionsScreen";
import { useAppSession } from "@app/state/AppSession";

enableScreens(true);

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;

  Physics: undefined;
  PhysicsLessons: { moduleId?: string; focusLessonId?: number } | undefined;
  PhysicsTask: { lessonBlockId: number; initialTaskId?: string; taskIds?: string[]; flowMode?: "demo5" | "standard" };

  Chemistry: undefined;
  ChemistryLessons:
    | {
        focusLessonId?: number;
        branch?: string;
        theoryMode?: "grade" | "bookline";
        initialGrade?: string;
        initialBookKey?: string;
      }
    | undefined;
  ChemistryTask: {
    lessonId: number;
    taskIds?: string[];
    branch?: string;
    flowMode?: "demo5" | "standard";
    topicTitle?: string;
    theoryMode?: "grade" | "bookline";
    theoryShort?: string;
    keyTerms?: string[];
  };
  ChemistryVisual: { topicTitle: string; visuals: string[]; theoryMode?: "grade" | "bookline"; grade?: string; bookLabel?: string };

  MoleculesGallery: { branch?: string } | undefined;
  MoleculeDetails: { moleculeId: string };
  Reactions3D: { branch?: string } | undefined;
  PeriodicTable: undefined;
  Biology: undefined;
  Subscriptions: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { t, lang } = useI18n();
  const { loading, onboardingDone } = useAppSession();

  const theme = useMemo(() => {
    return {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: "#050816",
        card: "#050816",
        border: "rgba(148,163,184,0.18)",
        text: "#e5e7eb",
        primary: "#33C3FF",
        notification: "#fca5a5",
      },
    };
  }, []);

  const stackAnim = Platform.OS === "ios" ? "slide_from_right" : "fade_from_bottom";

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#050816", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#93c5fd" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={theme}
        onUnhandledAction={(action) => {
          console.warn("[NAV] Unhandled action:", action?.type, action);
        }}
      >
        <Stack.Navigator
          initialRouteName={onboardingDone ? "MainTabs" : "Onboarding"}
          screenOptions={{
            headerStyle: { backgroundColor: "#050816" },
            headerTintColor: "#e5e7eb",
            headerShadowVisible: false,
            headerTitleStyle: {
              fontWeight: "800",
              ...(Platform.OS === "android" ? ({ fontWeight: "700" } as const) : null),
            },
            contentStyle: { backgroundColor: "#050816" },
            animation: stackAnim as any,
            animationDuration: 260,
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingRoleScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

          <Stack.Screen name="Physics" component={PhysicsScreen} options={{ title: t("physics") }} />
          <Stack.Screen name="PhysicsLessons" component={PhysicsLessonsScreen} options={{ title: t("lessons_title") }} />
          <Stack.Screen name="PhysicsTask" component={PhysicsTaskScreen} options={{ title: t("tasks_title") }} />

          <Stack.Screen name="Chemistry" component={ChemistryScreen} options={{ title: t("chemistry") }} />
          <Stack.Screen name="ChemistryLessons" component={ChemistryLessonsScreen} options={{ title: t("lessons_title") }} />
          <Stack.Screen name="ChemistryTask" component={ChemistryTaskScreen} options={{ title: t("tasks_title") }} />
          <Stack.Screen name="ChemistryVisual" component={ChemistryVisualScreen} options={{ title: lang === "ru" ? "Иллюстрации и схемы" : "Visuals" }} />

          <Stack.Screen name="MoleculesGallery" component={MoleculesGalleryScreen} options={{ title: t("molecules") }} />
          <Stack.Screen
            name="MoleculeDetails"
            component={MoleculeDetailScreen}
            options={{ title: lang === "ru" ? "Молекула" : "Molecule" }}
          />
          <Stack.Screen name="Reactions3D" component={Reactions3DScreen} options={{ title: t("reactions") + " 3D" }} />
          <Stack.Screen
            name="PeriodicTable"
            component={PeriodicTableScreen}
            options={{ title: lang === "ru" ? "Таблица Менделеева" : "Periodic Table" }}
          />
          <Stack.Screen
            name="Biology"
            component={BiologyScreen}
            options={{ title: lang === "ru" ? "Биология" : "Biology" }}
          />
          <Stack.Screen
            name="Subscriptions"
            component={SubscriptionsScreen}
            options={{ title: lang === "ru" ? "Подписки" : "Subscriptions" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
