// CareMate AI - task parser service
//
// parseTasks() first tries the real backend (POST {BACKEND_URL}/api/parse-tasks).
// When BACKEND_URL is empty, or the request fails / times out, it falls back to a
// deterministic LOCAL_MOCK so the whole UI stays demoable without a server.

import { BACKEND_URL, PARSE_TIMEOUT_MS } from "../config";
import { PARSE_SYSTEM } from "./prompts";
import type { Task, TaskCategory } from "../types";

export const CATEGORIES: TaskCategory[] = [
  "medication",
  "measure",
  "meal",
  "activity",
  "appointment",
  "other",
];

const ZH_TITLE: Record<string, string> = {
  mother: "媽媽",
  father: "爸爸",
  grandma: "阿嬤",
  grandpa: "阿公",
  媽媽: "媽媽",
  母親: "媽媽",
  爸爸: "爸爸",
  父親: "爸爸",
  阿嬤: "阿嬤",
  奶奶: "阿嬤",
  外婆: "阿嬤",
  阿公: "阿公",
  爺爺: "阿公",
  外公: "阿公",
};

function zhTitle(elderTitle: string): string {
  return ZH_TITLE[elderTitle] ?? elderTitle ?? "長輩";
}

/** Backend call. Returns null when not configured or on any failure. */
async function remoteParse(input: string, elderTitle: string): Promise<Task[] | null> {
  if (!BACKEND_URL) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);
    const res = await fetch(`${BACKEND_URL}/api/parse-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        elder_title: elderTitle,
        system: PARSE_SYSTEM,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const list = extractTaskList(data);
    return list ? list.map((t, i) => normalizeTask(t, i)) : null;
  } catch {
    return null;
  }
}

function extractTaskList(data: unknown): Array<Partial<Task>> | null {
  if (Array.isArray(data)) return data as Array<Partial<Task>>;
  if (data && typeof data === "object") {
    const maybe = (data as { tasks?: unknown }).tasks;
    if (Array.isArray(maybe)) return maybe as Array<Partial<Task>>;
  }
  return null;
}

function normalizeTask(raw: Partial<Task>, index: number): Task {
  const category: TaskCategory = CATEGORIES.includes(raw.category as TaskCategory)
    ? (raw.category as TaskCategory)
    : "other";
  return {
    id: raw.id ?? `t_${Date.now()}_${index}`,
    elderId: raw.elderId ?? "",
    time: typeof raw.time === "string" && raw.time.length > 0 ? raw.time : null,
    repeat: raw.repeat ?? "once",
    category,
    title: raw.title ?? "",
    detail: raw.detail ?? "",
    name: raw.name,
    dose: raw.dose,
    unit: raw.unit,
    condition: raw.condition,
    needsConfirm: raw.needsConfirm === true,
    confirmReason: raw.confirmReason,
    assumed: raw.assumed === true,
    assumedFrom: raw.assumedFrom,
    relativeTo: raw.relativeTo,
    offsetMinutes: raw.offsetMinutes,
    elder: raw.elder,
  };
}

export async function parseTasks(input: string, elderTitle: string): Promise<Task[]> {
  const text = (input ?? "").trim();
  if (!text) return [];
  const remote = await remoteParse(text, elderTitle);
  if (remote && remote.length > 0) return remote;
  return localMock(text, elderTitle);
}

// ---------------------------------------------------------------------------
// LOCAL_MOCK - deterministic rule-based parser used when no backend is available
// ---------------------------------------------------------------------------

type Draft = Omit<Task, "id" | "elderId">;

const PERIODS: Array<{ re: RegExp; time: string }> = [
  { re: /睡前/, time: "22:00" },
  { re: /早上|早晨|上午/, time: "08:00" },
  { re: /中午/, time: "12:00" },
  { re: /下午/, time: "15:00" },
  { re: /晚上|傍晚/, time: "19:00" },
];

const NUM_CHARS = "零一二兩三四五六七八九十";
const NUM_RE = `[${NUM_CHARS}\\d]`;
const CN_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

/** "一" -> 1, "二十" -> 20, "12" -> 12. Returns null when not a number. */
export function cnToNum(raw: string): number | null {
  const s = raw.trim();
  if (s.length === 0) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  let total = 0;
  let seen = false;
  let afterTen = false;
  for (const ch of s) {
    if (ch === "十") {
      total = (total === 0 ? 1 : total) * 10;
      seen = true;
      afterTen = true;
      continue;
    }
    const d = CN_DIGITS[ch];
    if (d === undefined) return null;
    if (!seen) total = d;
    else if (afterTen) total += d;
    else total = total * 10 + d;
    seen = true;
  }
  return seen ? total : null;
}

const SPLIT_RE = /[，,。；;\n]+|然後|接著|再來|之后|之後/;

interface TimeInfo {
  time: string | null;
  assumed?: boolean;
  assumedFrom?: string;
  relativeTo?: string;
  offsetMinutes?: number;
}

function extractTime(seg: string): TimeInfo {
  const abs = seg.match(new RegExp(`(${NUM_RE}{1,2})\\s*[:：點点]\\s*(${NUM_RE}{0,2})`));
  if (abs) {
    const h = cnToNum(abs[1]);
    const m = abs[2] ? cnToNum(abs[2]) : 0;
    if (h !== null && h >= 0 && h <= 23) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m ?? 0).padStart(2, "0");
      return { time: `${hh}:${mm}` };
    }
  }
  const rel = seg.match(new RegExp(`(${NUM_RE}{1,4})\\s*(分鐘|分钟|小時|小时)`));
  if (rel) {
    const isHour = rel[2] === "小時" || rel[2] === "小时";
    const n = cnToNum(rel[1]) ?? 0;
    const offset = isHour ? n * 60 : n;
    return { time: null, relativeTo: "上一項任務", offsetMinutes: offset > 0 ? offset : 30 };
  }
  for (const p of PERIODS) {
    const m = seg.match(p.re);
    if (m) return { time: p.time, assumed: true, assumedFrom: m[0] };
  }
  return { time: null };
}

function extractDose(seg: string): { dose?: string; unit?: string } {
  const m = seg.match(
    new RegExp(`(${NUM_RE}+(?:\\.\\d+)?)\\s*(顆|颗|錠|锭|粒|片|包|cc|毫升|ml|mL|mg|毫克|單位|单位|次)`)
  );
  if (!m) return {};
  const unitMap: Record<string, string> = { 颗: "顆", 锭: "錠", mL: "ml", 单位: "單位" };
  const n = cnToNum(m[1]);
  return { dose: n === null ? m[1] : String(n), unit: unitMap[m[2]] ?? m[2] };
}

function classify(seg: string, elderTitle: string): Draft | null {
  const who = zhTitle(elderTitle);
  const time = extractTime(seg);
  const dose = extractDose(seg);

  let category: TaskCategory | null = null;
  let name: string | undefined;
  let title = "";

  const medMatch = seg.match(/(血壓藥|血压药|血糖藥|血糖药|降壓藥|降壓药|藥|药|膠囊|胶囊|錠|锭|維他命|维他命|保健食品)/);
  const measureMatch = seg.match(/(血壓|血压|血糖|體溫|体温|脈搏|脉搏|血氧|體重|体重)/);
  const mealMatch = seg.match(/(早餐|午餐|晚餐|吃飯|吃饭|粥|牛奶|喝水|水果|點心|点心)/);
  const activityMatch = seg.match(/(散步|走路|運動|运动|復健|复健|拍背|曬太陽|晒太阳|伸展)/);
  const apptMatch = seg.match(/(回診|回诊|門診|门诊|看醫生|看医生|抽血|檢查|检查|復健科|复健科)/);

  if (medMatch) {
    category = "medication";
    name = medMatch[1];
    title = `提醒${who}吃${name}`;
  } else if (measureMatch) {
    category = "measure";
    name = measureMatch[1];
    title = `幫${who}量${name}`;
  } else if (apptMatch) {
    category = "appointment";
    name = apptMatch[1];
    title = `${who}${name}`;
  } else if (activityMatch) {
    category = "activity";
    name = activityMatch[1];
    title = `陪${who}${name}`;
  } else if (mealMatch) {
    category = "meal";
    name = mealMatch[1];
    title = `${who}的${name}`;
  }

  if (!category) return null;

  const hasTime = time.time !== null;
  const needsDose = category === "medication" && !dose.dose;
  const needsConfirm = !hasTime || needsDose;

  let confirmReason: string | undefined;
  if (!hasTime && needsDose) confirmReason = "未提到時間與劑量";
  else if (!hasTime) confirmReason = "未提到時間";
  else if (needsDose) confirmReason = "未提到劑量";

  const finalTime: string = time.time ?? "09:00";

  return {
    time: finalTime,
    repeat: "daily",
    category,
    title,
    detail: seg.trim(),
    name,
    dose: dose.dose,
    unit: dose.unit,
    condition: /飯後|饭后|飯前|饭前|空腹|睡前/.test(seg)
      ? (seg.match(/飯後|饭后|飯前|饭前|空腹/) ?? ["睡前"])[0]
      : undefined,
    needsConfirm,
    confirmReason,
    assumed: time.assumed ?? !hasTime,
    assumedFrom: time.assumedFrom ?? (!hasTime ? "未指定時間" : undefined),
    relativeTo: time.relativeTo,
    offsetMinutes: time.offsetMinutes,
  };
}

/** Deterministic offline parser. Always returns at least one task for non-empty input. */
export function localMock(input: string, elderTitle: string): Task[] {
  const segments = input
    .split(SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);

  const drafts: Draft[] = [];
  for (const seg of segments) {
    const d = classify(seg, elderTitle);
    if (d) drafts.push(d);
  }

  if (drafts.length === 0) {
    const who = zhTitle(elderTitle);
    drafts.push({
      time: "09:00",
      repeat: "once",
      category: "other",
      title: `照顧${who}：${input.trim().slice(0, 20)}`,
      detail: input.trim(),
      needsConfirm: true,
      confirmReason: "AI 無法判斷類型，請確認",
      assumed: true,
      assumedFrom: "未指定時間",
    });
  }

  const stamp = Date.now();
  return drafts.map((d, i) => ({ ...d, id: `t_${stamp}_${i}`, elderId: "" }));
}
