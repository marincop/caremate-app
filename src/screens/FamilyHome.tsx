import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatDose, useI18n } from "../i18n";
import { useApp } from "../store";
import { colors, font, radius, space } from "../theme";
import type { Task } from "../types";

function TaskRow({ task, done }: { task: Task; done: boolean }) {
  const { t, lang } = useI18n();
  const doseText = formatDose(task, lang);
  return (
    <View style={styles.taskRow}>
      <View style={styles.timeCol}>
        <Text style={styles.timeText}>{task.time ?? "--:--"}</Text>
      </View>
      <View style={styles.taskBody}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskMeta}>
          {t(`cat.${task.category}`)}
          {doseText ? ` · ${doseText}` : ""}
        </Text>
      </View>
      <View style={[styles.statusChip, done ? styles.statusDone : styles.statusPending]}>
        <Text style={styles.statusText}>{done ? t("common.done") : t("common.pending")}</Text>
      </View>
    </View>
  );
}

export default function FamilyHome() {
  const { t } = useI18n();
  const { elder, user, tasks, progress, latestBp, isDone } = useApp();
  const elderTitle = t(`title.${elder.titleKey}`);
  const remaining = progress.total - progress.done;
  const ratio = progress.total === 0 ? 0 : progress.done / progress.total;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>{t("family.greeting", { name: user.name })}</Text>
      <Text style={styles.sub}>{t("family.subGreeting", { elder: elderTitle })}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t("family.progress")}</Text>
        <Text style={styles.bigValue}>
          {t("family.completedOf", { done: progress.done, total: progress.total })}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t("family.latest")}</Text>
        <Text style={styles.measureName}>{t("family.bp")}</Text>
        <Text style={styles.bigValue}>
          {latestBp}
          <Text style={styles.unit}> {t("family.bpUnit")}</Text>
        </Text>
      </View>

      {remaining > 0 ? (
        <View style={styles.reminder}>
          <Text style={styles.reminderText}>{t("family.reminder", { n: remaining })}</Text>
        </View>
      ) : (
        <View style={styles.allDone}>
          <Text style={styles.allDoneText}>{t("family.alldone")}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t("family.tasks")}</Text>
      {tasks.length === 0 ? (
        <Text style={styles.empty}>{t("family.noTasks")}</Text>
      ) : (
        tasks.map((task) => <TaskRow key={task.id} task={task} done={isDone(task.id)} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: space.xl },
  greeting: { color: colors.text, fontSize: font.xl, fontWeight: "800" },
  sub: { color: colors.muted, fontSize: font.md, marginTop: space.xs, marginBottom: space.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { color: colors.muted, fontSize: font.sm, marginBottom: space.xs },
  measureName: { color: colors.muted, fontSize: font.sm },
  bigValue: { color: colors.primary, fontSize: font.xxl, fontWeight: "800" },
  unit: { color: colors.muted, fontSize: font.md, fontWeight: "500" },
  barTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.cardAlt,
    marginTop: space.sm,
    overflow: "hidden",
  },
  barFill: { height: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
  reminder: {
    backgroundColor: colors.dangerBg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.md,
  },
  reminderText: { color: colors.text, fontSize: font.md, fontWeight: "700" },
  allDone: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.md,
  },
  allDoneText: { color: colors.success, fontSize: font.md, fontWeight: "700" },
  sectionTitle: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: "700",
    marginBottom: space.sm,
  },
  empty: { color: colors.muted, fontSize: font.md },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeCol: { width: 60 },
  timeText: { color: colors.primary, fontSize: font.md, fontWeight: "700" },
  taskBody: { flex: 1 },
  taskTitle: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.text,
    fontSize: font.md,
    fontWeight: "600",
  },
  taskMeta: { color: colors.muted, fontSize: font.sm, marginTop: 2 },
  statusChip: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  statusDone: { backgroundColor: colors.primaryDark },
  statusPending: { backgroundColor: colors.dangerBg },
  statusText: { color: colors.text, fontSize: font.xs, fontWeight: "700" },
});
