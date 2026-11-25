import type { BatchPage } from "@/lib/batches/types";

export const PAGE_SIZE = 10;

/** Used only until the live asset list loads, or if it can't be fetched. */
export const FALLBACK_ASSETS = ["USDC", "XLM", "USDT"];

// These live outside app/(admin)/batches/page.tsx on purpose: a Next.js page
// module may only export the page and a fixed set of route options, so any
// other export fails `next build` with "does not match the required types".
export async function fetchBatches(
  params: { asset: string; status: string; cursor: string | null },
  { signal }: { signal?: AbortSignal } = {},
): Promise<BatchPage> {
  const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (params.asset) qs.set("asset", params.asset);
  if (params.status) qs.set("status", params.status);
  if (params.cursor) qs.set("cursor", params.cursor);
  const res = await fetch(`/api/admin/batches?${qs}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error("Couldn't load batches");
  return res.json();
}
