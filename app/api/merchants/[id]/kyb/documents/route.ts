/**
 * GET  /api/merchants/:id/kyb/documents  — list the merchant's documents.
 * POST /api/merchants/:id/kyb/documents  — upload one document (multipart).
 *
 * The POST body is `multipart/form-data` with:
 *   - `file`  (required) the document, PDF/JPG/PNG, 10 MB max
 *   - `type`  (required) one of the KYB document slots
 *   - `simulate` (optional) `"reject"` forces the new document into a
 *     rejected state with a reason — a demo affordance so the reviewer
 *     round-trip can be shown without an admin acting. Documented, not hidden.
 *
 * Server-side validation repeats the client checks: the browser layer is UX,
 * this is the boundary. A re-upload for a slot replaces the previous file and
 * moves that slot back to "under review".
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { KybDocType } from "@/lib/kyc/types";
import { KYB_DOC_TYPES } from "@/lib/kyc/types";
import {
  ACCEPTED_MIME_TYPES,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MIN_FILE_SIZE_BYTES,
  formatBytes,
} from "@/lib/kyc/validation";
import { getMerchantKyb, upsertDocument } from "@/lib/kyc/serverStore";

export const runtime = "nodejs";

const VALID_TYPES = new Set<string>(KYB_DOC_TYPES.map((d) => d.type));

function callerMerchantId(): string | null {
  try {
    return cookies().get("user_id")?.value ?? null;
  } catch {
    return null;
  }
}

function forbiddenForCaller(id: string): boolean {
  const caller = callerMerchantId();
  return Boolean(caller && caller !== id);
}

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (forbiddenForCaller(params.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return NextResponse.json(
    { data: getMerchantKyb(params.id).documents },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (forbiddenForCaller(params.id)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart/form-data upload." },
      { status: 400 },
    );
  }

  const type = form.get("type");
  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: "Unknown document type." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  }

  if (file.size < MIN_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  const mimeOk =
    (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type) ||
    (file.type === "" && hasAcceptedExtension(file.name));
  if (!mimeOk) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, JPG, or PNG." },
      { status: 415 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(
          MAX_FILE_SIZE_BYTES,
        )}.`,
      },
      { status: 413 },
    );
  }

  const simulateReject = form.get("simulate") === "reject";

  const profile = upsertDocument({
    merchantId: params.id,
    type: type as KybDocType,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    simulateReject,
  });

  const document = profile.documents.find((d) => d.type === type) ?? null;

  return NextResponse.json(
    { data: { document, kyb: profile } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
