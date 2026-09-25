import { NextResponse, NextRequest } from "next/server";
import { listMerchantActivity } from "@/lib/services/merchantService";

export const runtime = "nodejs";

export type { ActivityEvent } from "@/lib/services/merchantService";

/**
 * `/api/merchants/:id/activity` — cursor-paginated merchant activity feed.
 *
 * HTTP only: validate the path, read the query/header values and format the
 * response. Aggregation, filtering and pagination live in
 * `lib/services/merchantService.ts`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const merchantId = params.id;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchant ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page = await listMerchantActivity({
    merchantId,
    limit: searchParams.get("limit"),
    cursor: searchParams.get("cursor"),
    filter: searchParams.get("filter"),
    cookie: req.headers.get("cookie") ?? "",
  });

  return NextResponse.json(page, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
