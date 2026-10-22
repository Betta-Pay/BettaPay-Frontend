jest.mock("next/server", () => {
  class NextResponse {
    status: number;
    headers: Map<string, string>;
    bodyText: string;
    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.bodyText = body;
      this.status = init?.status ?? 200;
      this.headers = new Map(Object.entries(init?.headers ?? {}));
    }
    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new NextResponse(JSON.stringify(data), init);
    }
    async json() { return JSON.parse(this.bodyText); }
    async text() { return this.bodyText; }
  }
  return { NextResponse };
});
const mockGuard = jest.fn();
jest.mock("@/lib/auth/adminApiGuard", () => ({ guardAdminApi: () => mockGuard() }));

import { GET } from "../route";
import { appendAudit, resetAuditStore } from "@/lib/audit/store";

const req = (qs = "") => ({ url: `http://localhost/api/admin/audit${qs}` }) as unknown as Request;
const body = async (res: unknown) => (res as { json(): Promise<any> }).json();

beforeEach(() => {
  mockGuard.mockResolvedValue(null);
  resetAuditStore();
});

describe("GET /api/admin/audit", () => {
  it("is admin only", async () => {
    mockGuard.mockResolvedValue({ status: 403 });
    expect(await GET(req())).toEqual({ status: 403 });
  });

  it("renders SETTINGS_UPDATE with before/after and filters by action", async () => {
    const res = await GET(req("?action=SETTINGS_UPDATE"));
    const json = await body(res);
    expect(json.data[0].changes).toEqual({
      before: { defaultBps: 100, capUsdc: 250 },
      after: { defaultBps: 120, capUsdc: 250 },
    });
    expect(json.total).toBe(1);
  });

  it("paginates with a cursor and rejects bad input", async () => {
    for (let i = 0; i < 5; i++) appendAudit({ action: "P", entityType: "T", entityId: `${i}`, actorId: null, actorType: null, ipAddress: null, changes: null });
    const page1 = await body(await GET(req("?action=P&limit=2")));
    const page2 = await body(await GET(req(`?action=P&limit=2&cursor=${page1.nextCursor}`)));
    expect(page1.data).toHaveLength(2);
    expect(page2.data.map((e: { id: string }) => e.id)).not.toEqual(expect.arrayContaining(page1.data.map((e: { id: string }) => e.id)));
    expect((await GET(req("?limit=0"))).status).toBe(400);
    expect((await GET(req("?cursor=zzz"))).status).toBe(400);
    expect((await GET(req("?from=nope"))).status).toBe(400);
    expect((await GET(req("?from=2026-02-01&to=2026-01-01"))).status).toBe(400);
  });

  it("exports the whole filtered set as CSV", async () => {
    const res = (await GET(req("?action=SETTINGS_UPDATE&format=csv"))) as unknown as { status: number; headers: Map<string, string>; text(): Promise<string> };
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    const csv = await res.text();
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain("SETTINGS_UPDATE");
  });
});
