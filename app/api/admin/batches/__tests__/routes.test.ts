import { GET as list } from "../route";
import { GET as detail } from "../[id]/route";
import { getBatchStore, resetBatchStore } from "@/lib/batches/store";

// jsdom has no Request/Response, so stand in a minimal NextResponse.
jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
      const h = new Map(Object.entries(init?.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
      return { status: init?.status ?? 200, headers: { get: (k: string) => h.get(k.toLowerCase()) ?? null }, json: async () => data };
    },
  },
}));

const guard = jest.fn();
jest.mock("@/lib/auth/adminApiGuard", () => ({ guardAdminApi: () => guard() }));

const req = (qs = "") => ({ url: `http://x/api/admin/batches${qs}` }) as unknown as Request;
type Row = { id: string; status: string };

beforeEach(() => {
  guard.mockResolvedValue(null);
  resetBatchStore();
});

describe("GET /api/admin/batches", () => {
  it("is admin-guarded", async () => {
    guard.mockResolvedValue({ status: 403 });
    expect((await list(req())).status).toBe(403);
  });

  it("paginates stably with no overlap or gaps", async () => {
    const all = (await (await list(req("?limit=100"))).json()).data.map((b: Row) => b.id);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const res = await list(req(`?limit=2${cursor ? `&cursor=${cursor}` : ""}`));
      const body = await res.json();
      expect(res.headers.get("cache-control")).toBe("no-store");
      seen.push(...body.data.map((b: Row) => b.id));
      cursor = body.nextCursor;
    } while (cursor);
    expect(seen).toEqual(all);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("is not shifted by a batch created while browsing", async () => {
    const first = await (await list(req("?limit=2"))).json();
    getBatchStore().batches.push({
      id: "bat_late", asset: "USDC", totalCount: 0, totalGross: "0", totalFees: "0", totalNet: "0",
      createdAt: new Date(Date.now() + 60_000).toISOString(), processedAt: null,
    });
    const second = await (await list(req(`?limit=2&cursor=${first.nextCursor}`))).json();
    const ids = [...first.data, ...second.data].map((b: Row) => b.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids).not.toContain("bat_late");
  });

  it("filters by asset and derived status, and validates input", async () => {
    const xlm = await (await list(req("?asset=XLM"))).json();
    expect(xlm.data.map((b: Row) => b.id)).toEqual(["bat_proc"]);
    const proc = await (await list(req("?status=processing"))).json();
    expect(proc.data.length).toBeGreaterThan(0);
    expect(proc.data.every((b: Row) => b.status === "processing")).toBe(true);
    expect((await list(req("?status=bogus"))).status).toBe(400);
    expect((await list(req("?limit=0"))).status).toBe(400);
  });
});

describe("GET /api/admin/batches/:id", () => {
  it("returns the retry chain for the superseded batch", async () => {
    const { data } = await (await detail(req(), { params: { id: "bat_retry" } })).json();
    expect(data.status).toBe("completed");
    const a1 = data.members.find((m: { id: string }) => m.id === "stl_a1");
    expect(a1).toMatchObject({ superseded: true, supersededById: "stl_a2", chain: ["stl_a1", "stl_a2", "stl_a3"] });
    expect(data.members.find((m: { id: string }) => m.id === "stl_a3").superseded).toBe(false);
  });
  it("404s for an unknown batch", async () => {
    expect((await detail(req(), { params: { id: "nope" } })).status).toBe(404);
  });
});
