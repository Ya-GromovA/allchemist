import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "@app/screens/HomeScreen";
import AnalyticsScreen from "@app/screens/AnalyticsScreen";
import CabinetScreen from "@app/screens/CabinetScreen";

import AnimatedTabBar from "@app/components/AnimatedTabBar";
import { useAppSession } from "@app/state/AppSession";

export type MainTabParamList = {
  Home: undefined;
  Cabinet: undefined;
  Analytics: { initialModule?: "physics" | "chemistry" } | undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { role } = useAppSession();
  const roleKey = String(role || "student");
  const isTeacher = roleKey === "teacher";
  const isHomeroom = roleKey === "homeroom_teacher";
  const isParent = roleKey === "parent";

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Главная" }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: isTeacher ? "Урок" : isHomeroom ? "Класс" : isParent ? "Ребёнок" : "Учёба" }} />
      <Tab.Screen name="Cabinet" component={CabinetScreen} options={{ title: "Профиль" }} />
    </Tab.Navigator>
  );
}
