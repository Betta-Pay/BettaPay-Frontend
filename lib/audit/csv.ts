import { escapeCsvField } from "@/lib/utils/csv";
import type { AuditEntry } from "./types";

/** Neutralise spreadsheet formula injection from user-controlled cells. */
const safe = (v: unknown) => {
  const str = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
};

const HEADER = ["id", "createdAt", "action", "entityType", "entityId", "actorId", "ipAddress", "before", "after"];

/** CSV of the filtered set. Before/after are JSON so nothing is lost. */
export function auditToCsv(rows: AuditEntry[]): string {
  const lines = [HEADER.join(",")];
  for (const e of rows) {
    lines.push(
      [
        e.id,
        e.createdAt,
        e.action,
        e.entityType,
        e.entityId,
        e.actorId,
        e.ipAddress,
        e.changes ? JSON.stringify(e.changes.before) : "",
        e.changes ? JSON.stringify(e.changes.after) : "",
      ]
        .map((v) => escapeCsvField(safe(v)))
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}
