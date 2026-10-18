import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { AI_PIPELINE_BUDGET_MS } from "../server/ai-prompts/ai-config";
import { buildContentSecurityPolicy, resolveConnectSrcOrigins, contentSecurityPolicy } from "../server/browser-security";
import { routeFromPathname, pathnameForRoute } from "../src/lib/route-sync";
import { recordWordwallActivityStart, recordWordwallActivityClose, getWordwallTelemetryHistory } from "../src/features/student/wordwall-telemetry";
import { sortSkillMasteriesByScore, buildCognitiveRadarData, calculateDailyGoalProgressPct } from "../src/features/parent/parent-portal-helpers";

test("vercel.json configures maxDuration=60 for api/index.js and AI pipeline budget is 50s", () => {
  const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  assert.equal(vercel.functions?.["api/index.js"]?.maxDuration, 60);
  assert.equal(AI_PIPELINE_BUDGET_MS, 50000);
});

test("dynamic CSP helper preserves default policy and safely appends custom HTTPS Supabase origins", () => {
  assert.equal(buildContentSecurityPolicy(), contentSecurityPolicy);
  const origins = resolveConnectSrcOrigins("https://staging-proj.supabase.co");
  assert.ok(origins.includes("https://staging-proj.supabase.co"));
  assert.ok(origins.includes("wss://staging-proj.supabase.co"));
  // Rejects insecure HTTP custom origins
  const insecure = resolveConnectSrcOrigins("http://insecure.supabase.co");
  assert.ok(!insecure.includes("http://insecure.supabase.co"));
});

test("route-sync maps cleanly between URL pathnames and application routes", () => {
  assert.equal(routeFromPathname("/dashboard"), "dashboard");
  assert.equal(routeFromPathname("/exam/"), "exams");
  assert.equal(routeFromPathname("/wordwall"), "wordwall");
  assert.equal(routeFromPathname("/unknown-path", "landing"), "landing");
  assert.equal(pathnameForRoute("exams"), "/exam");
  assert.equal(pathnameForRoute("parent"), "/parent");
});


test("wordwall-telemetry records session start and duration on close", () => {
  recordWordwallActivityStart({ id: "78822332", title: "Şekil sınıflandırma", grade: 4, category: "Şekil sınıflandırma" }, 1000);
  const closed = recordWordwallActivityClose("78822332", 46000);
  assert.ok(closed);
  assert.equal(closed.activityId, "78822332");
  assert.equal(closed.durationSeconds, 45);
  assert.ok(getWordwallTelemetryHistory().length >= 1);
});

test("parent-portal-helpers sort masteries, build radar points, and compute goal percentage", () => {
  const sorted = sortSkillMasteriesByScore([
    { category: "logic", categoryName: "Mantık Muhakeme", mastery: 65, accuracy: 70 } as any,
    { category: "memory", categoryName: "Görsel Hafıza", mastery: 90, accuracy: 95 } as any,
  ]);
  assert.equal(sorted[0].mastery, 90);
  const radar = buildCognitiveRadarData(sorted);
  assert.equal(radar[0].category, "Görsel");
  assert.equal(calculateDailyGoalProgressPct(12, 15), 80);
  assert.equal(calculateDailyGoalProgressPct(25, 15), 100);
});
