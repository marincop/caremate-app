import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useI18n } from "../i18n";
import {
  ensureSpeechReady,
  isSpeechAvailable,
  speechLangFor,
  startListening,
  stopListening,
} from "../services/speech";
import { localMock, parseTasks } from "../services/taskParser";
import { useApp } from "../store";
import { colors, font, radius, space } from "../theme";
import type { Task } from "../types";

const SAMPLE = "早上八點提醒阿嬤吃血壓藥一顆，中午要量血壓，晚上睡前吃血糖藥";

export default function CreateTask() {
  const { t, lang } = useI18n();
  const { elder, addTasks } = useApp();
  const [input, setInput] = useState(SAMPLE);
  // Start with a demo parse so the screen is never a large empty area.
  const [parsed, setParsed] = useState<Task[] | null>(() => localMock(SAMPLE, elder.titleKey));
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState<boolean>(() => isSpeechAvailable());
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // Ref (not state) so a rapid double tap can never read a stale value.
  const listeningRef = useRef(false);

  useEffect(() => {
    let alive = true;
    ensureSpeechReady()
      .then((ok) => {
        if (alive) setVoiceReady(ok);
      })
      .catch(() => {
        if (alive) setVoiceReady(false);
      });
    return () => {
      alive = false;
      listeningRef.current = false;
      stopListening();
    };
  }, []);

  async function onVoicePress() {
    if (!voiceReady) return;

    if (listeningRef.current) {
      listeningRef.current = false;
      stopListening();
      setListening(false);
      return;
    }

    setVoiceError(null);
    setToast(null);
    listeningRef.current = true;
    setListening(true);

    const finish = (text: string) => {
      listeningRef.current = false;
      setListening(false);
      // Empty text = stopped without recognizing anything: keep what is typed.
      if (text) setInput(text);
    };

    try {
      await startListening({
        lang: speechLangFor(lang),
        onPartial: (text) => {
          if (text) setInput(text);
        },
        onFinal: finish,
        onError: () => {
          listeningRef.current = false;
          setListening(false);
          setVoiceError(t("create.voiceError"));
        },
      });
    } catch {
      listeningRef.current = false;
      setListening(false);
      setVoiceError(t("create.voiceError"));
    }
  }

  async function onParse() {
    const text = input.trim();
    if (!text) {
      setToast(t("create.empty"));
      return;
    }
    setToast(null);
    setLoading(true);
    try {
      const result = await parseTasks(text, elder.titleKey);
      setParsed(result);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  }

  function onAdd() {
    if (!parsed || parsed.length === 0) return;
    addTasks(parsed);
    setToast(t("create.added", { n: parsed.length }));
    setParsed(null);
    setIsDemo(false);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("create.title")}</Text>

      <View style={styles.voiceCard}>
        <Text style={styles.hint}>{t("create.hint")}</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t("create.placeholder")}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />

        <View style={styles.voiceRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? t("create.voiceStop") : t("create.voiceStart")}
            onPress={onVoicePress}
            disabled={!voiceReady}
            style={[
              styles.micBtn,
              listening ? styles.micBtnListening : null,
              !voiceReady ? styles.micBtnDisabled : null,
            ]}
          >
            <Text style={styles.micIcon}>🎤</Text>
          </Pressable>

          <Text style={[styles.micLabel, listening ? styles.micLabelListening : null]}>
            {listening ? t("create.voiceListening") : t("create.voiceStart")}
          </Text>

          {!voiceReady ? (
            <Text style={styles.micHint}>{t("create.voiceUnsupported")}</Text>
          ) : null}

          {voiceError ? <Text style={styles.voiceErrorText}>{voiceError}</Text> : null}
        </View>
      </View>

      <Pressable style={styles.primaryBtn} onPress={onParse} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.primaryBtnText}>
            {loading ? t("create.parsing") : t("create.aiOrganize")}
          </Text>
        )}
      </Pressable>

      {loading ? <Text style={styles.parsing}>{t("create.parsing")}</Text> : null}
      {toast ? <Text style={styles.toast}>{toast}</Text> : null}

      {parsed && parsed.length > 0 ? (
        <View>
          <View style={styles.previewHead}>
            <Text style={styles.sectionTitle}>{t("create.preview")}</Text>
            {isDemo ? (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>{t("create.demo")}</Text>
              </View>
            ) : null}
          </View>
          {parsed.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.badgeRow}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{t(`cat.${task.category}`)}</Text>
                </View>
                {task.needsConfirm ? (
                  <View style={styles.confirmBadge}>
                    <Text style={styles.confirmBadgeText}>{t("create.needsConfirm")}</Text>
                  </View>
                ) : null}
                {task.assumed ? (
                  <View style={styles.assumeBadge}>
                    <Text style={styles.assumeBadgeText}>{t("create.assumed")}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.taskTitle}>{task.title}</Text>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{t("field.time")}</Text>
                <Text style={styles.fieldValue}>{task.time ?? "--:--"}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{t("field.category")}</Text>
                <Text style={styles.fieldValue}>{t(`cat.${task.category}`)}</Text>
              </View>
              {task.dose ? (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{t("field.dose")}</Text>
                  <Text style={styles.fieldValue}>
                    {task.dose}
                    {task.unit ?? ""}
                  </Text>
                </View>
              ) : null}
              {task.confirmReason ? (
                <Text style={styles.reason}>{task.confirmReason}</Text>
              ) : null}
              {task.assumedFrom ? (
                <Text style={styles.assumedFrom}>
                  {t("create.assumedFrom", { from: task.assumedFrom })}
                </Text>
              ) : null}
            </View>
          ))}

          <Pressable style={styles.addBtn} onPress={onAdd}>
            <Text style={styles.addBtnText}>{t("create.addTasks")}</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.parsedHint}>{t("create.parsedHint")}</Text>
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
    marginBottom: space.md,
  },
  voiceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.md,
  },
  hint: { color: colors.primary, fontSize: font.sm, fontWeight: "700", marginBottom: space.sm },
  input: {
    color: colors.text,
    fontSize: font.lg,
    minHeight: 110,
    textAlignVertical: "top",
  },
  voiceRow: { alignItems: "center", marginTop: space.md },
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnListening: { backgroundColor: colors.danger, opacity: 0.85 },
  micBtnDisabled: { backgroundColor: colors.border, opacity: 0.5 },
  micIcon: { fontSize: 28 },
  micLabel: {
    color: colors.primary,
    fontSize: font.sm,
    fontWeight: "700",
    marginTop: space.sm,
    textAlign: "center",
  },
  micLabelListening: { color: colors.danger },
  micHint: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.muted,
    fontSize: font.xs,
    marginTop: space.xs,
    textAlign: "center",
  },
  voiceErrorText: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.danger,
    fontSize: font.sm,
    marginTop: space.xs,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
  },
  primaryBtnText: { color: colors.bg, fontSize: font.md, fontWeight: "800" },
  parsing: { color: colors.muted, fontSize: font.sm, marginTop: space.sm },
  toast: { color: colors.primary, fontSize: font.sm, marginTop: space.sm },
  previewHead: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  sectionTitle: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.text,
    fontSize: font.lg,
    fontWeight: "700",
  },
  demoBadge: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    marginLeft: space.sm,
  },
  demoBadgeText: { color: colors.primary, fontSize: font.xs, fontWeight: "700" },
  parsedHint: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.muted,
    fontSize: font.sm,
    marginTop: space.md,
    lineHeight: 20,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.sm,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: space.sm },
  catBadge: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    marginRight: space.xs,
  },
  catBadgeText: { color: colors.primary, fontSize: font.xs, fontWeight: "700" },
  confirmBadge: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    marginRight: space.xs,
  },
  confirmBadgeText: { color: colors.danger, fontSize: font.xs, fontWeight: "700" },
  assumeBadge: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  assumeBadgeText: { color: colors.warning, fontSize: font.xs, fontWeight: "700" },
  taskTitle: {
    flexShrink: 1,
    flexWrap: "wrap",
    color: colors.text,
    fontSize: font.md,
    fontWeight: "700",
    marginBottom: space.sm,
  },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  fieldLabel: { color: colors.muted, fontSize: font.sm },
  fieldValue: { color: colors.text, fontSize: font.sm, fontWeight: "600" },
  reason: { color: colors.danger, fontSize: font.sm, marginTop: space.sm },
  assumedFrom: { color: colors.warning, fontSize: font.sm, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
    marginTop: space.md,
  },
  addBtnText: { color: colors.text, fontSize: font.md, fontWeight: "800" },
});
