/** PATCH /api/admin/alerts/rules/:ruleId – update threshold, window, severity or enabled. */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { isAlertMetric, validateRulePatch } from "@/lib/alerts/rules";
import { evaluateAll } from "@/lib/alerts/evaluator";
import { getAlertStore, recordAudit } from "@/lib/alerts/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { ruleId: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  if (!isAlertMetric(params.ruleId)) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = validateRulePatch(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const store = getAlertStore();
  const rule = store.rules.find((r) => r.id === params.ruleId);
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  Object.assign(rule, result.patch, { updatedAt: new Date().toISOString() });
  recordAudit(store, {
    action: "ALERT_RULE_UPDATED",
    entityType: "ALERT_RULE",
    entityId: rule.id,
    actor: "admin",
    detail: JSON.stringify(result.patch),
  });
  // Re-evaluate straight away so a lowered threshold fires without waiting.
  evaluateAll(store);

  return NextResponse.json({ data: rule }, { headers: { "Cache-Control": "no-store" } });
}
