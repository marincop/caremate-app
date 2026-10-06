// CareMate AI - local state store (React Context + AsyncStorage), with demo seed data

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CareLink, Elder, Task, TaskLog, User } from "./types";

const STORAGE_KEY = "caremate.state.v1";

// ---------------------------------------------------------------------------
// Demo seed
// ---------------------------------------------------------------------------

export const DEMO_ELDER: Elder = {
  id: "elder_1",
  name: "林陳阿嬤",
  titleKey: "grandma",
  birthYear: 1941,
};

export const DEMO_FAMILY: User = { id: "u_family_1", role: "family", name: "小美" };
export const DEMO_CAREGIVER: User = { id: "u_cg_1", role: "caregiver", name: "Siti" };
export const DEMO_LINK: CareLink = {
  id: "link_1",
  familyUserId: DEMO_FAMILY.id,
  caregiverUserId: DEMO_CAREGIVER.id,
  elderId: DEMO_ELDER.id,
};

const E = DEMO_ELDER.id;

export const DEMO_TASKS: Task[] = [
  {
    id: "t1",
    elderId: E,
    time: "08:00",
    repeat: "daily",
    category: "measure",
    title: "幫阿嬤量血壓",
    detail: "坐姿休息 5 分鐘後量測",
    name: "血壓",
    unit: "mmHg",
    needsConfirm: false,
  },
  {
    id: "t2",
    elderId: E,
    time: "08:00",
    repeat: "daily",
    category: "medication",
    title: "提醒阿嬤吃血壓藥",
    detail: "飯後服用，配溫水",
    name: "脈優",
    dose: "1",
    unit: "顆",
    condition: "飯後",
    needsConfirm: false,
  },
  {
    id: "t3",
    elderId: E,
    time: "12:00",
    repeat: "daily",
    category: "meal",
    title: "阿嬤的午餐",
    detail: "軟食為主，少油少鹽",
    name: "午餐",
    needsConfirm: false,
  },
  {
    id: "t4",
    elderId: E,
    time: "15:00",
    repeat: "daily",
    category: "activity",
    title: "陪阿嬤散步",
    detail: "社區中庭走 20 分鐘，注意防曬",
    name: "散步",
    needsConfirm: false,
  },
  {
    id: "t5",
    elderId: E,
    time: "19:00",
    repeat: "daily",
    category: "medication",
    title: "提醒阿嬤吃血糖藥",
    detail: "晚餐後服用",
    name: "血糖藥",
    dose: "1",
    unit: "顆",
    condition: "飯後",
    needsConfirm: true,
    confirmReason: "未確認藥名與劑量是否正確",
  },
  {
    id: "t6",
    elderId: E,
    time: null,
    repeat: "weekly",
    category: "appointment",
    title: "心臟科回診",
    detail: "需帶健保卡與藥單",
    name: "回診",
    needsConfirm: true,
    confirmReason: "未提到時間",
    assumed: true,
    assumedFrom: "未指定時間",
  },
];

export const DEMO_LOGS: TaskLog[] = [
  {
    id: "l1",
    taskId: "t1",
    doneAt: new Date().toISOString(),
    value: "138/86",
  },
  {
    id: "l2",
    taskId: "t3",
    doneAt: new Date().toISOString(),
    note: "吃了一碗粥跟半份青菜",
  },
];

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface AppState {
  ready: boolean;
  elder: Elder;
  user: User;
  caregiver: User;
  link: CareLink;
  tasks: Task[];
  logs: TaskLog[];
  addTasks: (tasks: Task[]) => void;
  completeTask: (task: Task, value?: string) => void;
  undoTask: (taskId: string) => void;
  isDone: (taskId: string) => boolean;
  progress: { done: number; total: number };
  /** latest blood-pressure reading recorded today, e.g. "138/86" */
  latestBp: string | null;
}

export const AppContext = React.createContext<AppState | null>(null);

function todayPrefix(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useCareMateStore(): AppState {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
  const [logs, setLogs] = useState<TaskLog[]>(DEMO_LOGS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && alive) {
          const parsed = JSON.parse(raw) as { tasks?: Task[]; logs?: TaskLog[] };
          if (Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
          if (Array.isArray(parsed.logs)) setLogs(parsed.logs);
        }
      } catch {
        // keep seed on any storage error
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, logs })).catch(() => {});
  }, [tasks, logs, ready]);

  const addTasks = useCallback((incoming: Task[]) => {
    setTasks((prev) => [
      ...prev,
      ...incoming.map((t) => ({ ...t, elderId: t.elderId || DEMO_ELDER.id })),
    ]);
  }, []);

  const completeTask = useCallback((task: Task, value?: string) => {
    setLogs((prev) => {
      if (prev.some((l) => l.taskId === task.id)) return prev;
      const log: TaskLog = {
        id: `l_${Date.now()}`,
        taskId: task.id,
        doneAt: new Date().toISOString(),
        value,
      };
      return [...prev, log];
    });
  }, []);

  const undoTask = useCallback((taskId: string) => {
    setLogs((prev) => prev.filter((l) => l.taskId !== taskId));
  }, []);

  const todaysLogs = useMemo(() => {
    const prefix = todayPrefix();
    return logs.filter((l) => l.doneAt.slice(0, 10) === prefix);
  }, [logs]);

  const doneIds = useMemo(() => new Set(todaysLogs.map((l) => l.taskId)), [todaysLogs]);

  const isDone = useCallback((taskId: string) => doneIds.has(taskId), [doneIds]);

  const progress = useMemo(() => {
    const done = tasks.filter((t) => doneIds.has(t.id)).length;
    return { done, total: tasks.length };
  }, [tasks, doneIds]);

  const latestBp = useMemo(() => {
    const bpLogs = todaysLogs.filter((l) => l.value && /\d{2,3}\s*\/\s*\d{2,3}/.test(l.value));
    const last = bpLogs[bpLogs.length - 1];
    return last?.value ?? "138/86";
  }, [todaysLogs]);

  return {
    ready,
    elder: DEMO_ELDER,
    user: DEMO_FAMILY,
    caregiver: DEMO_CAREGIVER,
    link: DEMO_LINK,
    tasks,
    logs,
    addTasks,
    completeTask,
    undoTask,
    isDone,
    progress,
    latestBp,
  };
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppContext.Provider");
  return ctx;
}
