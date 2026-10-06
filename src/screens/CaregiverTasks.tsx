import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LANG_LABELS, useI18n, type Lang } from "../i18n";
import { caregiverText, formatCondition, formatDose } from "../services/caregiverText";
import { useApp } from "../store";
import { colors, fontLarge, radius, space, touchMin } from "../theme";
import type { Task } from "../types";

const LANGS: Lang[] = ["id", "vi", "zh-Hant"];

function CaregiverTaskCard({ task }: { task: Task }) {
  const { t, lang } = useI18n();
  const { elder, isDone, completeTask, undoTask } = useApp();
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const texts = caregiverText(task, elder.titleKey, lang);
  const doseText = formatDose(task, lang);
  const condText = formatCondition(task, lang);
  const done = isDone(task.id);
  const needsValue = task.category === "measure";

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.cardHead}>
        <Text style={styles.time}>{task.time ?? "--:--"}</Text>
        <View style={styles.catBadge}>
          <Text style={styles.catText}>{t(`cat.${task.category}`)}</Text>
        </View>
      </View>

      <Text style={styles.taskTitle}>{texts.title}</Text>
      {doseText ? <Text style={styles.dose}>{doseText}</Text> : null}
      {condText ? <Text style={styles.condition}>{condText}</Text> : null}

      {done ? (
        <>
          <Text style={styles.doneLabel}>{t("common.done")}</Text>
          <Pressable style={styles.undoBtn} onPress={() => undoTask(task.id)}>
            <Text style={styles.undoText}>{t("cg.undo")}</Text>
          </Pressable>
        </>
      ) : needsValue ? (
        <View>
          <View style={styles.valueRow}>
            <View style={styles.valueCol}>
              <Text style={styles.valueLabel}>{t("cg.systolic")}</Text>
              <TextInput
                value={sys}
                onChangeText={setSys}
                keyboardType="number-pad"
                placeholder="120"
                placeholderTextColor={colors.muted}
                style={styles.valueInput}
              />
            </View>
            <View style={styles.valueCol}>
              <Text style={styles.valueLabel}>{t("cg.diastolic")}</Text>
              <TextInput
                value={dia}
                onChangeText={setDia}
                keyboardType="number-pad"
                placeholder="80"
                placeholderTextColor={colors.muted}
                style={styles.valueInput}
              />
            </View>
          </View>
          <Pressable
            style={styles.doneBtn}
            onPress={() => completeTask(task, sys && dia ? `${sys}/${dia}` : undefined)}
          >
            <Text style={styles.doneBtnText}>{t("cg.save")}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.doneBtn} onPress={() => completeTask(task)}>
          <Text style={styles.doneBtnText}>{t("cg.markDone")}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function CaregiverTasks() {
  const { t, lang, setLang } = useI18n();
  const { elder, tasks, progress } = useApp();

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99")),
    [tasks]
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.langBar}>
        <Text style={styles.langLabel}>{t("cg.langLabel")}</Text>
        <View style={styles.langPills}>
          {LANGS.map((l) => (
            <Pressable
              key={l}
              onPress={() => setLang(l)}
              style={[styles.langPill, lang === l && styles.langPillActive]}
            >
              <Text style={[styles.langPillText, lang === l && styles.langPillTextActive]}>
                {l === "zh-Hant" ? "中文" : l === "id" ? "ID" : "VI"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.title}>{t("cg.title")}</Text>
      <Text style={styles.subtitle}>
        {t("cg.subtitle", { elder: t(`title.${elder.titleKey}`) })} ·{" "}
        {t("family.completedOf", { done: progress.done, total: progress.total })}
      </Text>

      {sorted.length === 0 ? (
        <Text style={styles.empty}>{t("cg.noTasks")}</Text>
      ) : (
        sorted.map((task) => <CaregiverTaskCard key={task.id} task={task} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: space.xl },
  langBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  langLabel: { color: colors.muted, fontSize: fontLarge.sm },
  langPills: { flexDirection: "row" },
  langPill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: space.xs,
  },
  langPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langPillText: { color: colors.muted, fontSize: fontLarge.sm, fontWeight: "700" },
  langPillTextActive: { color: colors.bg },
  title: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.text,
    fontSize: fontLarge.xxl,
    fontWeight: "800",
  },
  subtitle: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.muted,
    fontSize: fontLarge.md,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  empty: { color: colors.muted, fontSize: fontLarge.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.md,
  },
  cardDone: { opacity: 0.6 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  time: { color: colors.primary, fontSize: fontLarge.xl, fontWeight: "800" },
  catBadge: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  catText: { color: colors.primary, fontSize: fontLarge.sm, fontWeight: "700" },
  taskTitle: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.text,
    fontSize: fontLarge.lg,
    fontWeight: "700",
    marginTop: space.sm,
  },
  dose: { color: colors.warning, fontSize: fontLarge.lg, fontWeight: "800", marginTop: space.xs },
  condition: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.muted,
    fontSize: fontLarge.md,
    marginTop: 2,
  },
  doneLabel: { color: colors.success, fontSize: fontLarge.md, fontWeight: "700", marginTop: space.sm },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: touchMin,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.md,
  },
  doneBtnText: { color: colors.bg, fontSize: fontLarge.md, fontWeight: "800" },
  undoBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: touchMin,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.sm,
  },
  undoText: { color: colors.muted, fontSize: fontLarge.md, fontWeight: "700" },
  valueRow: { flexDirection: "row", marginTop: space.sm },
  valueCol: { flex: 1, marginRight: space.sm },
  valueLabel: { color: colors.muted, fontSize: fontLarge.sm, marginBottom: space.xs },
  valueInput: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontLarge.lg,
    paddingHorizontal: space.md,
    minHeight: touchMin,
  },
});
