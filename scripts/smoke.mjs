// CareMate AI - smoke test
// Pins the test to LOCAL_MOCK so it is deterministic regardless of BACKEND_URL
// (parseTasks() calls the live backend when BACKEND_URL is set, and remote tasks
// may legitimately have time=null when the family did not specify a time).
//
// Run: npm run smoke    (node --import tsx scripts/smoke.mjs)

import { localMock } from "../src/services/taskParser.ts";
import { CATEGORIES } from "../src/services/taskParser.ts";

const INPUT =
  "早上八點提醒媽媽吃血壓藥一顆，中午要量血壓，晚上睡前吃血糖藥，晚餐後散步二十分鐘";

let failures = 0;
function check(label, ok, detail) {
  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failures += 1;
  console.log(`  [${mark}] ${label}${detail !== undefined ? ` -> ${detail}` : ""}`);
}

console.log("CareMate AI - taskParser LOCAL_MOCK smoke test (deterministic)");
console.log("input:", INPUT);
console.log("");

const tasks = localMock(INPUT, "mother");

console.log(`returned ${tasks.length} task(s)`);
console.log("");

check("returns a non-empty array", Array.isArray(tasks) && tasks.length > 0, tasks.length);

const validCategories = new Set(CATEGORIES);

tasks.forEach((task, i) => {
  const label = `task[${i}] ${task.category} "${task.title}"`;
  check(`${label}: has time (string or null)`, (typeof task.time === "string" && task.time.length > 0) || task.time === null, task.time);
  check(`${label}: category is valid`, validCategories.has(task.category), task.category);
  check(`${label}: needsConfirm is boolean`, typeof task.needsConfirm === "boolean", task.needsConfirm);
  check(`${label}: has title`, typeof task.title === "string" && task.title.length > 0);
  check(`${label}: has detail`, typeof task.detail === "string" && task.detail.length > 0);
});

console.log("");
console.log("full result:");
console.log(JSON.stringify(tasks, null, 2));
console.log("");

if (failures === 0) {
  console.log("SMOKE TEST PASSED");
  process.exit(0);
} else {
  console.log(`SMOKE TEST FAILED (${failures} check(s))`);
  process.exit(1);
}
