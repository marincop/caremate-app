import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useI18n } from "../i18n";
import { useApp } from "../store";
import { colors, font, radius, space } from "../theme";
import type { TaskCategory } from "../types";

const GROUPS: TaskCategory[] = ["meal", "medication", "measure", "activity"];

export default function DailySummary() {
  const { t, lang } = useI18n();
  const { elder, tasks, logs, isDone, latestBp, progress } = useApp();

  const elderTitle = t(`title.${elder.titleKey}`);

  const summary = useMemo(() => {
    const lines: string[] = [];
    lines.push(
      lang === "id"
        ? `Hari ini ${progress.done} dari ${progress.total} tugas selesai.`
        : lang === "vi"
          ? `Hôm nay hoàn thành ${progress.done}/${progress.total} việc.`
          : `今天完成 ${progress.done}/${progress.total} 項任務。`
    );
    lines.push(
      lang === "id"
        ? `Tekanan darah terakhir ${latestBp} mmHg.`
        : lang === "vi"
          ? `Huyết áp gần nhất ${latestBp} mmHg.`
          : `最近一次血壓 ${latestBp} mmHg。`
    );
    const pending = tasks.length - progress.done;
    if (pending > 0) {
      lines.push(
        lang === "id"
          ? `Masih ada ${pending} tugas belum selesai.`
          : lang === "vi"
            ? `Còn ${pending} việc chưa xong.`
            : `還有 ${pending} 項任務未完成。`
      );
    } else {
      lines.push(
        lang === "id"
          ? "Semua tugas selesai, bagus sekali."
          : lang === "vi"
            ? "Mọi việc đã xong, rất tốt."
            : "所有任務都完成了，狀況良好。"
      );
    }
    return lines.join(" ");
  }, [lang, progress.done, progress.total, latestBp, tasks.length]);

  const generatedAt = new Date().toLocaleTimeString();
  const dateLabel = new Date().toLocaleDateString();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("sum.title")}</Text>
      <Text style={styles.subtitle}>{t("sum.subtitle", { date: dateLabel })}</Text>

      <View style={styles.aiCard}>
        <Text style={styles.aiLabel}>{t("sum.aiLine")}</Text>
        <Text style={styles.aiText}>{summary}</Text>
        <Text style={styles.generated}>{t("sum.generatedAt", { time: generatedAt })}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t("sum.keyRecords")}</Text>

      {GROUPS.map((group) => {
        const groupTasks = tasks.filter((x) => x.category === group);
        const doneCount = groupTasks.filter((x) => isDone(x.id)).length;
        return (
          <View key={group} style={styles.recordRow}>
            <View style={styles.recordLeft}>
              <Text style={styles.recordName}>{t(`sum.${group === "measure" ? "bp" : group}`)}</Text>
              <Text style={styles.recordDetail}>
                {groupTasks.length === 0
                  ? t("sum.noRecord")
                  : `${doneCount}/${groupTasks.length} · ${elderTitle}`}
              </Text>
            </View>
            <View
              style={[
                styles.dot,
                { backgroundColor: groupTasks.length > 0 && doneCount === groupTasks.length ? colors.success : colors.warning },
              ]}
            />
          </View>
        );
      })}

      <View style={styles.recordRow}>
        <View style={styles.recordLeft}>
          <Text style={styles.recordName}>{t("sum.water")}</Text>
          <Text style={styles.recordDetail}>{t("sum.noRecord")}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: colors.muted }]} />
      </View>

      <Text style={styles.logCount}>
        {t("common.today")} · {t("common.items", { n: logs.length })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: space.xl },
  title: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.text,
    fontSize: font.xl,
    fontWeight: "800",
  },
  subtitle: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.muted,
    fontSize: font.md,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  aiCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    padding: space.md,
    marginBottom: space.lg,
  },
  aiLabel: { color: colors.primary, fontSize: font.sm, fontWeight: "800", marginBottom: space.sm },
  aiText: { color: colors.text, fontSize: font.md, lineHeight: 24 },
  generated: { color: colors.muted, fontSize: font.xs, marginTop: space.sm },
  sectionTitle: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: "700",
    marginBottom: space.sm,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.sm,
  },
  recordLeft: { flex: 1 },
  recordName: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.text,
    fontSize: font.md,
    fontWeight: "700",
  },
  recordDetail: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.muted,
    fontSize: font.sm,
    marginTop: 2,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  logCount: { color: colors.muted, fontSize: font.sm, marginTop: space.md },
});
