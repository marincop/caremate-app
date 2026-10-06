import React, { useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { I18nContext, translate, type I18nValue, type Lang } from "./src/i18n";
import CaregiverTasks from "./src/screens/CaregiverTasks";
import CreateTask from "./src/screens/CreateTask";
import DailySummary from "./src/screens/DailySummary";
import FamilyHome from "./src/screens/FamilyHome";
import { AppContext, useCareMateStore } from "./src/store";
import { colors, font, space } from "./src/theme";

type TabKey = "family" | "create" | "caregiver" | "summary";

const TABS: Array<{ key: TabKey; icon: string }> = [
  { key: "family", icon: "🏠" },
  { key: "create", icon: "➕" },
  { key: "caregiver", icon: "🧑‍⚕️" },
  { key: "summary", icon: "📋" },
];

function Screen({ tab }: { tab: TabKey }) {
  switch (tab) {
    case "create":
      return <CreateTask />;
    case "caregiver":
      return <CaregiverTasks />;
    case "summary":
      return <DailySummary />;
    default:
      return <FamilyHome />;
  }
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("family");
  const [lang, setLang] = useState<Lang>("zh-Hant");
  const app = useCareMateStore();

  const i18n: I18nValue = useMemo(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang]
  );

  return (
    <AppContext.Provider value={app}>
      <I18nContext.Provider value={i18n}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe}>
          <View style={styles.body}>
            <Screen tab={tab} />
          </View>

          <View style={styles.tabBar}>
            {TABS.map(({ key, icon }) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  style={styles.tabItem}
                  onPress={() => {
                    setTab(key);
                    if (key === "caregiver" && lang === "zh-Hant") setLang("id");
                  }}
                >
                  <Text style={[styles.tabIcon, active && styles.tabActive]}>{icon}</Text>
                  <Text style={[styles.tabLabel, active && styles.tabActive]}>
                    {translate(lang, `tab.${key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </I18nContext.Provider>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: space.sm,
  },
  tabItem: { flex: 1, alignItems: "center" },
  tabIcon: { fontSize: 18, opacity: 0.6 },
  tabLabel: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.muted,
    fontSize: font.xs,
    marginTop: 2,
    textAlign: "center",
  },
  tabActive: { color: colors.primary, opacity: 1 },
});
