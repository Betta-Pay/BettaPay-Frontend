jest.mock("next/server", () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return { status: init?.status ?? 200, body: data };
    },
  },
}));
const mockGuard = jest.fn();
jest.mock("@/lib/auth/adminApiGuard", () => ({ guardAdminApi: () => mockGuard() }));

import { isValidIp } from "../validateIp";
import { clearLiveIpScore, fetchLiveIpScore } from "../backend";
import { listIps, recordAttempt, resetIpStore, summarize } from "../store";
import { GET as detailGET } from "@/app/api/admin/security/ip-scores/[ip]/route";
import { GET as listGET } from "@/app/api/admin/security/ip-scores/route";
import { POST as clearPOST } from "@/app/api/admin/security/ip-scores/[ip]/clear/route";
import { queryAudit, resetAuditStore } from "@/lib/audit/store";

const HIGH = "203.0.113.45";
const mockFetch = jest.fn();
const realFetch = global.fetch;

const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
const req = (headers: Record<string, string> = {}) =>
  ({ url: "http://localhost/x", headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } }) as unknown as Request;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const body = (res: unknown) => (res as { body: any }).body;

beforeEach(() => {
  mockGuard.mockReset().mockResolvedValue(null);
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.ADMIN_API_KEY = "k".repeat(32);
  resetIpStore();
  resetAuditStore();
});
afterAll(() => {
  global.fetch = realFetch;
});

describe("isValidIp", () => {
  it.each(["1.2.3.4", "2001:db8::1", "::1"])("accepts %s", (ip) => expect(isValidIp(ip)).toBe(true));
  it.each(["", "999.1.1.1", "abc", "1.2.3", "1.2.3.4/24", "1.2.3.4;rm", undefined, 5])("rejects %p", (ip) =>
    expect(isValidIp(ip)).toBe(false),
  );
});

describe("backend client", () => {
  it("returns the live score and sends the admin key server-side", async () => {
    mockFetch.mockResolvedValue(ok({ ip: HIGH, score: 31 }));
    const r = await fetchLiveIpScore(HIGH);
    expect(r).toMatchObject({ ok: true, live: { ip: HIGH, score: 31 } });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain(`/api/admin/auth/ip-score?ip=${HIGH}`);
    expect(init.headers["x-admin-api-key"]).toBe("k".repeat(32));
  });

  it("reports non-2xx, malformed bodies and network failure without inventing a score", async () => {
    mockFetch.mockResolvedValueOnce(ok({}, 403));
    expect(await fetchLiveIpScore(HIGH)).toEqual({ ok: false, error: "Backend returned 403" });
    mockFetch.mockResolvedValueOnce(ok({ ip: HIGH }));
    expect((await fetchLiveIpScore(HIGH)).ok).toBe(false);
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect(await fetchLiveIpScore(HIGH)).toEqual({ ok: false, error: "Backend unreachable" });
  });

  it("reports a timeout", async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    expect(await fetchLiveIpScore(HIGH)).toEqual({ ok: false, error: "Backend unreachable (timed out)" });
  });

  it("never calls the backend for an invalid IP", async () => {
    expect((await fetchLiveIpScore("nope")).ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("treats 404/405 on clear as 'not supported', not a failure", async () => {
    mockFetch.mockResolvedValue(ok({}, 404));
    expect(await clearLiveIpScore(HIGH)).toEqual({ cleared: false, note: "Backend does not support clearing scores yet" });
    mockFetch.mockResolvedValue(ok({}, 200));
    expect(await clearLiveIpScore(HIGH)).toEqual({ cleared: true, note: null });
  });
});

describe("store derivations", () => {
  it("locks out an IP at the threshold and counts down the retry window", () => {
    const s = summarize(HIGH);
    expect(s.cachedScore).toBe(24);
    expect(s.lockedOut).toBe(true);
    expect(s.retryAfterSeconds).toBeGreaterThan(0);
    expect(s.retryAfterSeconds).toBeLessThanOrEqual(900);
  });

  it("successes lower the score and an IP under threshold has no retry window", () => {
    const s = summarize("198.51.100.7");
    expect(s.cachedScore).toBe(5);
    expect(s.lockedOut).toBe(false);
    expect(s.retryAfterSeconds).toBe(0);
  });

  it("lets old failures age out of the 15 minute window", () => {
    expect(summarize(HIGH, Date.now() + 16 * 60_000)).toMatchObject({ cachedScore: 0, lockedOut: false });
  });

  it("sorts highest score first and filters by substring", () => {
    expect(listIps()[0].ip).toBe(HIGH);
    expect(listIps("198.51").map((i) => i.ip)).toEqual(["198.51.100.7"]);
  });

  it("tracks a new IP once an attempt is recorded", () => {
    recordAttempt({ ip: "192.0.2.9", outcome: "failure", endpoint: "/api/auth/login", statusCode: 401 });
    expect(summarize("192.0.2.9").cachedScore).toBe(1);
  });
});

describe("routes", () => {
  it("lists tracked IPs and enforces the admin guard", async () => {
    const res = await listGET(req());
    expect(body(res).threshold).toBe(20);
    expect(body(res).data[0].ip).toBe(HIGH);
    mockGuard.mockResolvedValue({ status: 403, body: { error: "Forbidden" } });
    expect((await listGET(req())) as unknown).toMatchObject({ status: 403 });
  });

  it("detail combines the live score with the attempt stream, newest first", async () => {
    mockFetch.mockResolvedValue(ok({ ip: HIGH, score: 25 }));
    const b = body(await detailGET(req(), { params: { ip: HIGH } }));
    expect(b.live.score).toBe(25);
    expect(b.liveError).toBeNull();
    expect(b.attempts.length).toBe(24);
    expect(b.attempts[0].at >= b.attempts[1].at).toBe(true);
  });

  it("detail falls back to cached data with an explicit liveError when the backend is down", async () => {
    mockFetch.mockRejectedValue(new Error("down"));
    const b = body(await detailGET(req(), { params: { ip: HIGH } }));
    expect(b.live).toBeNull();
    expect(b.liveError).toMatch(/unreachable/);
    expect(b.summary.lockedOut).toBe(true);
  });

  it("decodes an encoded IPv6 path segment and rejects junk", async () => {
    mockFetch.mockResolvedValue(ok({ ip: "2001:db8::1a", score: 2 }));
    const good = await detailGET(req(), { params: { ip: encodeURIComponent("2001:db8::1a") } });
    expect((good as { status: number }).status).toBe(200);
    const bad = await detailGET(req(), { params: { ip: "not-an-ip" } });
    expect((bad as { status: number }).status).toBe(400);
  });

  it("clear takes effect locally, reports backendCleared honestly and writes an audit entry", async () => {
    mockFetch.mockResolvedValue(ok({}, 404));
    const res = await clearPOST(req({ "x-forwarded-for": "10.0.0.5, 1.1.1.1" }), { params: { ip: HIGH } });
    const b = body(res);
    expect(b.backendCleared).toBe(false);
    expect(b.backendNote).toMatch(/does not support/);
    expect(b.summary).toMatchObject({ cachedScore: 0, lockedOut: false, clearedBy: "admin" });

    const audit = queryAudit({ action: "IP_SCORE_CLEARED" }).data[0];
    expect(audit).toMatchObject({ entityType: "IP", entityId: HIGH, actorId: "admin", ipAddress: "10.0.0.5", id: b.auditId });
    expect(audit.changes).toEqual({
      before: { score: 24, lockedOut: true },
      after: { score: 0, lockedOut: false, backendCleared: false },
    });
  });

  it("reports backendCleared true when the backend confirms", async () => {
    mockFetch.mockResolvedValue(ok({}, 204));
    expect(body(await clearPOST(req(), { params: { ip: HIGH } })).backendCleared).toBe(true);
  });
});
