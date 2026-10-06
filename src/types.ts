// CareMate AI - core data model

export interface Elder {
  id: string;
  name: string;
  /** i18n key of the relationship, e.g. "mother" / "grandma" */
  titleKey: string;
  birthYear?: number;
}

export type TaskCategory =
  | "medication"
  | "measure"
  | "meal"
  | "activity"
  | "appointment"
  | "other";

export interface Task {
  id: string;
  elderId: string;
  /** "HH:MM" in 24h format, or null when the family did not say a time */
  time: string | null;
  /** repeat rule, e.g. "daily" / "weekly" / "once" */
  repeat: string;
  category: TaskCategory;
  title: string;
  detail: string;
  /** concrete target, e.g. "血壓" / "脈優" */
  name?: string;
  dose?: string;
  unit?: string;
  /** condition such as "飯後" / "空腹" */
  condition?: string;
  needsConfirm: boolean;
  confirmReason?: string;
  assumed?: boolean;
  /** original wording the assumption came from, e.g. "早上" */
  assumedFrom?: string;
  /** relative-time anchor, e.g. "起床後" */
  relativeTo?: string;
  offsetMinutes?: number;
  /** when one sentence covers several elders */
  elder?: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  /** ISO timestamp */
  doneAt: string;
  value?: string;
  note?: string;
}

export type UserRole = "family" | "caregiver";

export interface User {
  id: string;
  role: UserRole;
  name: string;
}

export interface CareLink {
  id: string;
  familyUserId: string;
  caregiverUserId: string;
  elderId: string;
}
