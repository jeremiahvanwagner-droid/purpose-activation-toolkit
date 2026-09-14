/**
 * The keepsake (lib/workbook.ts) and progress rules (lib/progress.ts) with a
 * synthetic, fully worked set of answers.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorkbook, type Entry, type Workbook } from "../lib/workbook.ts";
import { isStarted } from "../lib/progress.ts";

const ANSWERS: Record<string, unknown> = {
  // Module 1
  "pa.s1.here": "To help others see what God placed in them.",
  "pa.values.ranked": ["Faith", "Family", "Integrity"],
  "pa.stmt.identity": "a patient teacher",
  "pa.stmt.calling": "open doors of understanding",
  "pa.stmt.audience": "young adults starting out",
  "pa.stmt.method": "mentoring and plain teaching",
  "pa.s5.domain.work": { current: "Busy, scattered", vision: "Focused service", shift: "One priority a day" },
  "pa.s8.focus": "Health / Wellness",
  "pa.s8.weeks": { w1: "Walk three times", w4: "Walking is normal" },
  "pa.s8.micro": ["10 minutes of Scripture", "A short walk"],
  "pa.s8.commitment": { name: "Sample Reader", signature: "Sample Reader", date: "September 14, 2026", sealed: true },
  // Module 2
  "dm.s3.seven": { decision: "Take the new role?", question: "Am I running toward my calling?", prayer: "Peace about direction" },
  "dm.s4.r1": { thought: "I'll never get another chance", type: "Catastrophizing", truth: "God is not limited by one opportunity" },
  "dm.s5.grid": {
    decision: "Which role",
    options: ["Stay", "Move"],
    scores: { purpose: [3, 5], values: [4, 4], impact: [3, 5], peace: [2, 4], practical: [5, 3] },
  },
  "dm.s7.career": { q: "Is this growth or escape?", v: "Stewardship", c: "Ask for 30 days" },
  "dm.s8.pending": { facing: "The role decision", action: "Accept with a 90-day review", reviewDate: "December 14, 2026" },
  // Module 3
  "ata.s4.resistance": { pairs: [{ r: "Perfectionism", bypass: "Write one sentence" }] },
  "ata.s5.ritual": { morning: "Scripture and one intention", middayTime: "12:30 PM", evening: "Three aligned actions" },
  "ata.s6.eco": { partnerName: "A mentor", communityName: "Divine Path Walkers" },
  "ata.s7.tracker": [{ date: "Sep 14", action: "Walked and prayed", note: "Calmer" }, {}, { action: "Called a friend" }],
  "ata.s9.focus": "Health",
  "ata.s9.actions": ["Walk", "Rest", "Serve"],
  "ata.s9.rituals": { morning: "6:15 Purpose Morning" },
  "ata.s9.acct": { partner: "A mentor", service: "Weekly meal" },
  "ata.s9.reviews": { m1: "October 14" },
  // Module 4
  "ep.deck.purpose": { "0": "What feels assigned to me is teaching." },
  "ep.lab.s1": { struggle: "Procrastination", action: "What is one 5-minute step?" },
  "ep.toolkit": { "purpose:0": "morning", "decision:4": "decision", "reflection:10": "evening" },
};

function module(wb: Workbook, slug: string) {
  const m = wb.modules.find((x) => x.slug === slug);
  assert.ok(m, `module ${slug}`);
  return m;
}
const headings = (wb: Workbook, slug: string) => module(wb, slug).sections.map((s) => s.heading);
const entries = (wb: Workbook, slug: string, heading: string): Entry[] =>
  module(wb, slug).sections.find((s) => s.heading === heading)?.entries ?? [];
const text = (e: Entry[]) => JSON.stringify(e);

test("the keepsake carries every kind of exercise the modules collect", () => {
  const wb = buildWorkbook(ANSWERS, "September 14, 2026");
  assert.equal(wb.anyContent, true);
  assert.equal(wb.name, "Sample Reader");

  // Module 1: statement, values, domain map, 30-day plan with its covenant.
  assert.match(text(entries(wb, "purpose-activation", "Purpose statement")), /Because God designed me as a patient teacher/);
  assert.match(text(entries(wb, "purpose-activation", "Core values")), /Integrity/);
  assert.match(text(entries(wb, "purpose-activation", "Six life domains")), /One priority a day/);
  const plan = text(entries(wb, "purpose-activation", "30-day activation plan"));
  assert.match(plan, /Walking is normal/);
  assert.match(plan, /"sealed":true/);

  // Module 2: seven steps (with an honest count), distortions, full grid, domains, pending decision.
  assert.match(text(entries(wb, "decision-making", "7-Step Divine Decision Framework")), /2 of 7 written/);
  assert.match(text(entries(wb, "decision-making", "Renewing the mind")), /Catastrophizing/);
  const grid = entries(wb, "decision-making", "Values-Based Decision Grid").find((e) => e.k === "grid");
  assert.ok(grid && grid.k === "grid");
  assert.deepEqual(grid.options, [
    { name: "Stay", total: 17 },
    { name: "Move", total: 21 },
  ]);
  assert.deepEqual(grid.criteria.find((c) => c.label === "Inner Peace Level")?.scores, [2, 4]);
  assert.match(text(entries(wb, "decision-making", "Decisions in every domain")), /Ask for 30 days/);
  assert.match(text(entries(wb, "decision-making", "Decision Covenant")), /Accept with a 90-day review/);

  // Module 3: resistance, ritual, ecosystem, tracker, full 90-day plan.
  assert.match(text(entries(wb, "alignment-to-action", "Removing friction")), /Write one sentence/);
  assert.match(text(entries(wb, "alignment-to-action", "Daily ritual")), /12:30 PM/);
  assert.match(text(entries(wb, "alignment-to-action", "Accountability, community, and service")), /Divine Path Walkers/);
  const tracker = entries(wb, "alignment-to-action", "21-Day Alignment Tracker")[0];
  assert.ok(tracker && tracker.k === "tracker");
  assert.equal(tracker.done, 2);
  assert.deepEqual(tracker.days.map((d) => d.n), [1, 3]);
  const p90 = text(entries(wb, "alignment-to-action", "90-day focus plan"));
  for (const expected of ["6:15 Purpose Morning", "Weekly meal", "October 14", "Serve"]) assert.match(p90, new RegExp(expected));

  // Module 4: journal answers, lab, and the personal prompt toolkit by rotation.
  assert.ok(headings(wb, "execution-prompts").includes("Purpose Activation"));
  assert.match(text(entries(wb, "execution-prompts", "Custom prompt lab")), /Procrastination/);
  const kit = entries(wb, "execution-prompts", "My personal prompt toolkit");
  assert.deepEqual(
    kit.map((e) => (e.k === "list" ? e.label : "")),
    ["Morning", "Decision moments", "Evening"]
  );
  assert.match(text(kit), /What am I trying to protect by delaying or avoiding this decision\?/);
});

test("an unfinished purpose statement stays in the keepsake", () => {
  const wb = buildWorkbook({ "pa.stmt.identity": "a patient teacher" }, "");
  assert.match(text(entries(wb, "purpose-activation", "Purpose statement")), /in progress/);
});

test("progress counts started exercises honestly", () => {
  assert.equal(isStarted("dm.s3.seven", { decision: "Take the new role?" }), false, "a title alone is not the 7 steps");
  assert.equal(isStarted("dm.s3.seven", { decision: "x", question: "The real question" }), true);
  assert.equal(isStarted("pa.s8.commitment", { name: "Sample Reader" }), false, "an unsigned covenant");
  assert.equal(isStarted("pa.s8.commitment", { name: "Sample Reader", signature: "S", sealed: true }), true);
  assert.equal(isStarted("dm.s5.grid", { decision: "x", options: ["A", "B"] }), false, "no scores yet");
  assert.equal(isStarted("dm.s5.grid", { scores: { peace: [0, 3] } }), true);
  assert.equal(isStarted("ata.s3.formula", { domain: "Finances" }), false);
  assert.equal(isStarted("pa.s1.here", "   "), false);
  assert.equal(isStarted("pa.s1.here", "An answer"), true);
});
