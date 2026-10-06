// CareMate AI - tiny i18n layer (no external dependency)

import React, { createContext, useContext } from "react";

import type { Task } from "../types";
import { zhHant } from "./zh-Hant";
import { id } from "./id";
import { vi } from "./vi";

export type Lang = "zh-Hant" | "id" | "vi";
export type Dict = Record<string, string>;

export const dictionaries: Record<Lang, Dict> = {
  "zh-Hant": zhHant,
  id,
  vi,
};

export const LANG_LABELS: Record<Lang, string> = {
  "zh-Hant": "中文",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
};

export type TVars = Record<string, string | number>;

/** Translate a key, falling back to zh-Hant and then to the key itself. */
export function translate(lang: Lang, key: string, vars?: TVars): string {
  const dict = dictionaries[lang] ?? zhHant;
  let out = dict[key] ?? zhHant[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      out = out.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return out;
}

/**
 * Dose unit lookup ("顆" -> "tablet"). Falls back to the raw value so an
 * unknown unit never turns into a "unit.xxx" technical string.
 */
export function unitLabel(lang: Lang, unit?: string | null): string | null {
  if (!unit) return null;
  const key = `unit.${unit}`;
  return dictionaries[lang]?.[key] ?? zhHant[key] ?? unit;
}

/** Medication condition lookup ("飯後" -> "setelah makan"). */
export function conditionLabel(lang: Lang, condition?: string | null): string | null {
  if (!condition) return null;
  const key = `cond.${condition}`;
  return dictionaries[lang]?.[key] ?? zhHant[key] ?? condition;
}

/**
 * Renders a dose with its translated unit: "1 tablet" (id/vi) / "1顆" (zh-Hant).
 * Returns null when the task has no dose.
 */
export function formatDose(task: Task, lang: Lang): string | null {
  if (!task.dose) return null;
  const unit = unitLabel(lang, task.unit);
  if (!unit) return task.dose;
  return lang === "zh-Hant" ? `${task.dose}${unit}` : `${task.dose} ${unit}`;
}

/** Translated medication condition ("飯後" -> "setelah makan"). */
export function formatCondition(task: Task, lang: Lang): string | null {
  return conditionLabel(lang, task.condition);
}

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: TVars) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nContext.Provider");
  return ctx;
}

/** Convenience: just the translator function. */
export function useT(): (key: string, vars?: TVars) => string {
  return useI18n().t;
}
