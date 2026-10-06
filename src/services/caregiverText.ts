// CareMate AI - STUB local translator for the caregiver view.
// In production this text comes from the backend TRANSLATE_SYSTEM prompt
// (see src/services/prompts.ts). Here we render a deterministic template so the
// caregiver screen is readable in Indonesian / Vietnamese without a server.
//
// Dose units and conditions are NOT hard-coded per screen: they resolve through
// the i18n dictionaries (unit.* / cond.* keys) so no Chinese leaks into a
// non-Chinese interface. The formatters live in src/i18n and are re-exported
// here for convenience.

import { conditionLabel, formatCondition, formatDose, type Lang } from "../i18n";
import type { Task } from "../types";

export { formatCondition, formatDose };

const ID_WHO: Record<string, string> = {
  mother: "Ibu",
  father: "Bapak",
  grandma: "Nenek",
  grandpa: "Kakek",
  other: "Lansia",
};

const VI_WHO: Record<string, string> = {
  mother: "Mẹ",
  father: "Bố",
  grandma: "Bà",
  grandpa: "Ông",
  other: "Người lớn tuổi",
};

const ID_NAME: Record<string, string> = {
  血壓: "tekanan darah",
  血压: "tekanan darah",
  血糖: "gula darah",
  體溫: "suhu tubuh",
  体温: "suhu tubuh",
  血氧: "kadar oksigen",
  早餐: "sarapan",
  午餐: "makan siang",
  晚餐: "makan malam",
  喝水: "minum air",
  散步: "jalan-jalan",
};

const VI_NAME: Record<string, string> = {
  血壓: "huyết áp",
  血压: "huyết áp",
  血糖: "đường huyết",
  體溫: "thân nhiệt",
  体温: "thân nhiệt",
  血氧: "oxy trong máu",
  早餐: "bữa sáng",
  午餐: "bữa trưa",
  晚餐: "bữa tối",
  喝水: "uống nước",
  散步: "đi dạo",
};

function idSentence(task: Task, who: string, dose: string | null, cond: string | null): string {
  const name = task.name ? ID_NAME[task.name] : undefined;
  const dosePart = dose ? ` ${dose}` : "";
  const condPart = cond ? ` (${cond})` : "";
  switch (task.category) {
    case "medication":
      return `Tolong ingatkan ${who} minum obat${name ? ` ${name}` : ""}${dosePart}${condPart}`;
    case "measure":
      return `Tolong ukur ${name ?? "tekanan darah"} ${who}`;
    case "meal":
      return `Beri ${who} ${name ?? "makan"}`;
    case "activity":
      return `Ajak ${who} ${name ?? "aktivitas ringan"}`;
    case "appointment":
      return `Antar ${who} kontrol ke dokter`;
    default:
      return `Bantu ${who} dengan perawatan`;
  }
}

function viSentence(task: Task, who: string, dose: string | null, cond: string | null): string {
  const name = task.name ? VI_NAME[task.name] : undefined;
  const dosePart = dose ? ` ${dose}` : "";
  const condPart = cond ? ` (${cond})` : "";
  switch (task.category) {
    case "medication":
      return `Nhắc ${who} uống thuốc${name ? ` ${name}` : ""}${dosePart}${condPart}`;
    case "measure":
      return `Đo ${name ?? "huyết áp"} cho ${who}`;
    case "meal":
      return `Cho ${who} ${name ?? "ăn"}`;
    case "activity":
      return `Cùng ${who} ${name ?? "vận động"}`;
    case "appointment":
      return `Đưa ${who} đi tái khám`;
    default:
      return `Hỗ trợ ${who} chăm sóc`;
  }
}

export function caregiverText(
  task: Task,
  elderTitleKey: string,
  lang: Lang
): { title: string; detail: string } {
  if (lang === "zh-Hant") return { title: task.title, detail: task.detail };
  const who = (lang === "vi" ? VI_WHO : ID_WHO)[elderTitleKey] ?? ID_WHO.other;
  const dose = formatDose(task, lang);
  const cond = formatCondition(task, lang);
  const title =
    lang === "vi" ? viSentence(task, who, dose, cond) : idSentence(task, who, dose, cond);
  const uncertain = task.needsConfirm
    ? lang === "vi"
      ? " (cần xác nhận)"
      : " (mohon konfirmasi)"
    : "";
  return { title: `${title}${uncertain}`, detail: task.detail };
}
