/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("next/server", () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return {
        status: init?.status ?? 200,
        json: async () => data,
      };
    },
  },
}));

const mockGuard = jest.fn();
jest.mock("@/lib/auth/adminApiGuard", () => ({ guardAdminApi: () => mockGuard() }));

import { GET } from "../route";
import { POST as ingest } from "../metrics/route";
import { POST as ack } from "../[id]/ack/route";
import { PATCH as patchRule } from "../rules/[ruleId]/route";
import { getAlertStore, resetAlertStore } from "@/lib/alerts/store";

const req = (url: string, body?: unknown) =>
  ({ url: `http://localhost${url}`, json: async () => body }) as unknown as Request;
const json = async (res: unknown) => (res as { json: () => Promise<any> }).json();

beforeEach(() => {
  resetAlertStore();
  mockGuard.mockReset().mockResolvedValue(null);
});

describe("admin alerts API", () => {
  it("threshold crossing appears on the next GET, ack persists and clears unread", async () => {
    const before = await json(await GET(req("/api/admin/alerts")));
    expect(before.events).toHaveLength(0);
    expect(before.unreadCount).toBe(0);

    const res = await ingest(req("/api/admin/alerts/metrics", { metric: "auth_lockout_wave", value: 25 }));
    expect((res as { status: number }).status).toBe(202);

    const polled = await json(await GET(req(`/api/admin/alerts?since=${before.cursor}`)));
    expect(polled.events).toHaveLength(1);
    expect(polled.events[0]).toMatchObject({ ruleId: "auth_lockout_wave", status: "open" });
    expect(polled.unreadCount).toBe(1);

    const id = polled.events[0].id;
    const acked = await ack(req(`/api/admin/alerts/${id}/ack`), { params: { id } });
    const ackBody = await json(acked);
    expect(ackBody.data.status).toBe("acknowledged");
    expect(ackBody.unreadCount).toBe(0);

    // Persisted: a fresh read still shows it acknowledged and not unread.
    const after = await json(await GET(req("/api/admin/alerts")));
    expect(after.events[0].status).toBe("acknowledged");
    expect(after.unreadCount).toBe(0);
    expect(getAlertStore().audit.map((a) => a.action)).toContain("ALERT_ACKNOWLEDGED");

    // Diff poll after the ack returns just the changed event.
    const diff = await json(await GET(req(`/api/admin/alerts?since=${polled.cursor}`)));
    expect(diff.events.map((e: { id: string }) => e.id)).toEqual([id]);
  });

  it("rejects non-admins, bad metrics and invalid rule patches", async () => {
    mockGuard.mockResolvedValueOnce({ status: 403, json: async () => ({ error: "Forbidden" }) });
    expect((await GET(req("/api/admin/alerts")) as { status: number }).status).toBe(403);

    expect((await ingest(req("/m", { metric: "nope", value: 1 })) as { status: number }).status).toBe(400);
    expect((await ingest(req("/m", { metric: "fx_deviation", value: -1 })) as { status: number }).status).toBe(400);

    const bad = await patchRule(req("/r", { threshold: 0 }), { params: { ruleId: "fx_deviation" } });
    expect((bad as { status: number }).status).toBe(400);
    const ok = await patchRule(req("/r", { threshold: 3, windowMinutes: 20 }), { params: { ruleId: "fx_deviation" } });
    expect((await json(ok)).data).toMatchObject({ threshold: 3, windowMinutes: 20 });
  });
});
