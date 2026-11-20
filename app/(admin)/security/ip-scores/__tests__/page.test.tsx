import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IpScoresPage from "../page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/lib/hooks/useNotify", () => ({ useNotify: () => notify }));

const HIGH = "203.0.113.45";
const lockedSummary = {
  ip: HIGH, cachedScore: 24, threshold: 20, lockedOut: true, retryAfterSeconds: 600,
  lastEventAt: "2026-10-22T10:00:00Z", failures: 24, successes: 0, clearedAt: null, clearedBy: null,
};
const clearedSummary = { ...lockedSummary, cachedScore: 0, lockedOut: false, retryAfterSeconds: 0, clearedAt: "2026-10-22T10:05:00Z", clearedBy: "admin" };
const attempts = [
  { id: "a2", ip: HIGH, at: "2026-10-22T10:00:00Z", outcome: "failure", endpoint: "/api/auth/wallet/verify", statusCode: 401 },
  { id: "a1", ip: HIGH, at: "2026-10-22T09:59:00Z", outcome: "failure", endpoint: "/api/auth/login", statusCode: 401 },
];

let cleared = false;
beforeEach(() => {
  cleared = false;
  Object.values(notify).forEach((f) => f.mockReset());
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const json = (b: unknown) => ({ ok: true, status: 200, json: async () => b });
    if (url.endsWith("/clear") && init?.method === "POST") {
      cleared = true;
      return json({ summary: clearedSummary, backendCleared: false, backendNote: "Backend does not support clearing scores yet", auditId: "aud_1" });
    }
    if (url.includes(`/ip-scores/${HIGH}`)) {
      return json({ summary: cleared ? clearedSummary : lockedSummary, attempts, live: { ip: HIGH, score: cleared ? 0 : 25, fetchedAt: "2026-10-22T10:01:00Z" }, liveError: null });
    }
    return json({ data: [cleared ? clearedSummary : lockedSummary], threshold: 20 });
  }) as unknown as typeof fetch;
});

it("shows a high-score IP, its attempt stream, then its cleared state", async () => {
  render(<IpScoresPage />);
  const row = (await screen.findByText(HIGH)).closest("tr")!;
  expect(within(row).getByText("24/20")).toBeInTheDocument();
  expect(within(row).getByText("Locked out")).toBeInTheDocument();

  await userEvent.click(within(row).getByRole("button", { name: `View attempts for ${HIGH}` }));
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByText("Live from backend")).toBeInTheDocument();
  expect(within(dialog).getByText("/api/auth/wallet/verify")).toBeInTheDocument();
  expect(within(dialog).getAllByText("Failure")).toHaveLength(2);

  await userEvent.click(within(dialog).getByRole("button", { name: "Clear score" }));
  await userEvent.click(within(dialog).getByRole("button", { name: "Yes, clear score" }));

  await waitFor(() => expect(notify.info).toHaveBeenCalled());
  expect(notify.info.mock.calls[0][0]).toMatch(/backend did not confirm/);
  expect(await within(dialog).findByText(/Cleared .* by admin/)).toBeInTheDocument();
  await waitFor(() => expect(within(screen.getByText(HIGH, { selector: "td" }).closest("tr")!).getByText("Cleared")).toBeInTheDocument());
});

it("looks up a pasted full IP live and labels the source", async () => {
  render(<IpScoresPage />);
  await screen.findByText(HIGH, { selector: "td" });
  await userEvent.type(screen.getByLabelText("Search IP address"), HIGH);
  expect(await screen.findByTestId("score-sources")).toHaveTextContent("Live from backend");
  expect(screen.getByTestId("score-sources")).toHaveTextContent("Cached");
});
