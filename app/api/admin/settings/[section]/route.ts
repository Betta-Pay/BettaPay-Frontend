/**
 * PATCH /api/admin/settings/:section
 *
 * Validates against the section schema, persists, and writes a SETTINGS_UPDATE
 * audit entry holding only that section's before/after. Outside production the
 * `x-simulate-failure: 1` header makes the save fail with a 500 without
 * persisting or auditing, so rollback can be demonstrated.
 */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { appendAudit } from "@/lib/audit/store";
import { fieldErrors, isSection, sectionSchemas } from "@/lib/settings/schema";
import { saveSection, sectionValues } from "@/lib/settings/store";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function PATCH(request: Request, { params }: { params: { section: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { section } = params;
  if (!isSection(section)) {
    return NextResponse.json({ error: "Unknown settings section" }, { status: 404, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const parsed = sectionSchemas[section].safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", fields: fieldErrors(parsed.error) }, { status: 400, headers });
  }

  if (process.env.NODE_ENV !== "production" && request.headers.get("x-simulate-failure") === "1") {
    return NextResponse.json({ error: "Simulated failure while saving" }, { status: 500, headers });
  }

  const before = sectionValues(section);
  const saved = saveSection(section, parsed.data as never);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");

  appendAudit({
    action: "SETTINGS_UPDATE",
    entityType: "PLATFORM_SETTINGS",
    entityId: section,
    actorId: "admin",
    actorType: "admin",
    ipAddress: ip ?? null,
    changes: { before, after: parsed.data },
  });

  return NextResponse.json({ data: saved }, { headers });
}
