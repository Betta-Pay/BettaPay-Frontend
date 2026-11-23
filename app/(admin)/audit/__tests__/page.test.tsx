import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAuditPage from "../page";
import type { AuditEntry, AuditPage } from "@/lib/audit/types";

let mockSearch = "";
const mockReplace = jest.fn((url: string) => {
  mockSearch = url.includes("?") ? url.split("?")[1] : "";
});
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/audit",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const settings: AuditEntry = {
  id: "a1", action: "SETTINGS_UPDATE", entityType: "PLATFORM_SETTINGS", entityId: "fees", actorId: "admin", actorType: "admin",
  ipAddress: "102.89.34.17", createdAt: "2026-10-01T10:00:00.000Z",
  changes: { before: { defaultBps: 100, capUsdc: 250 }, after: { defaultBps: 150, capUsdc: 250 } },
};
const kyb: AuditEntry = {
  id: "a2", action: "KYB_REVIEW", entityType: "MERCHANT", entityId: "merch-1", actorId: "r1", actorType: "admin",
  ipAddress: null, createdAt: "2026-10-01T09:00:00.000Z",
  changes: { before: { kybStatus: "pending" }, after: { kybStatus: "approved", note: "ok" } },
};

const fetchMock = jest.fn();
const page = (data: AuditEntry[], nextCursor: string | null = null, total = data.length): AuditPage => ({ data, total, nextCursor });
const respond = (p: AuditPage) => ({ ok: true, status: 200, json: async () => p });
const respondError = (message: string) => ({ ok: false, status: 500, json: async () => ({ error: message }) });

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminAuditPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockSearch = "";
  mockReplace.mockClear();
  fetchMock.mockReset();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
});

describe("AdminAuditPage", () => {
  it("renders a SETTINGS_UPDATE change as a structured diff and links the KYB entity", async () => {
    fetchMock.mockResolvedValue(respond(page([settings, kyb])));
    renderPage();
    const rows = await screen.findAllByTestId("audit-row");
    expect(rows).toHaveLength(2);

    await userEvent.click(within(rows[0]).getByRole("button", { name: /view diff/i }));
    const diff = within(rows[0]).getByRole("list", { name: /changed fields/i });
    expect(within(diff).getByText("Modified")).toBeInTheDocument();
    expect(within(diff).getByText("defaultBps")).toBeInTheDocument();
    expect(within(diff).getByTestId("diff-before")).toHaveTextContent("100");
    expect(within(diff).getByTestId("diff-after")).toHaveTextContent("150");
    expect(within(diff).queryByText("capUsdc")).not.toBeInTheDocument();

    await userEvent.click(within(rows[1]).getByRole("button", { name: /view diff/i }));
    expect(within(rows[1]).getByText("kybStatus")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Added")).toBeInTheDocument(); // note
    expect(within(rows[1]).getByRole("link", { name: /merch-1/ })).toHaveAttribute("href", "/merchants/kyb?merchant=merch-1");
    // Settings entity has no entity page of its own beyond /admin/settings, so it links there.
    expect(within(rows[0]).getByRole("link", { name: /fees/ })).toHaveAttribute("href", "/admin/settings");
  });

  it("reads filters from the URL, sends them to the API, and writes changes back", async () => {
    mockSearch = "action=SETTINGS_UPDATE&from=2026-10-01";
    fetchMock.mockResolvedValue(respond(page([settings])));
    renderPage();
    await screen.findByTestId("audit-row");

    const url = new URL(fetchMock.mock.calls[0][0], "http://x");
    expect(url.searchParams.get("action")).toBe("SETTINGS_UPDATE");
    expect(url.searchParams.get("from")).toBe("2026-10-01T00:00:00.000Z");
    expect(screen.getByLabelText("Action")).toHaveValue("SETTINGS_UPDATE");
    expect(screen.getByLabelText("From")).toHaveValue("2026-10-01");

    await userEvent.selectOptions(screen.getByLabelText("Entity type"), "MERCHANT");
    expect(mockReplace).toHaveBeenLastCalledWith("/audit?entityType=MERCHANT&action=SETTINGS_UPDATE&from=2026-10-01", { scroll: false });
  });

  it("keeps rows on screen while a refetch runs and pages with the cursor", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(page([settings], "CUR1", 2)))
      .mockResolvedValueOnce(respond(page([kyb], null, 2)));
    renderPage();
    await screen.findByTestId("audit-row");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 2");

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() => expect(screen.getAllByTestId("audit-row")).toHaveLength(2));
    expect(new URL(fetchMock.mock.calls[1][0], "http://x").searchParams.get("cursor")).toBe("CUR1");
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("exports the filtered set as CSV", async () => {
    mockSearch = "q=fees";
    fetchMock.mockResolvedValue(respond(page([settings])));
    renderPage();
    await screen.findByTestId("audit-row");
    const link = screen.getByRole("link", { name: /export csv/i });
    const href = new URL(link.getAttribute("href")!, "http://x");
    expect(href.pathname).toBe("/api/admin/audit");
    expect(href.searchParams.get("format")).toBe("csv");
    expect(href.searchParams.get("q")).toBe("fees");
    expect(href.searchParams.has("cursor")).toBe(false);
  });

  it("shows an empty state with a clear action and an error with retry", async () => {
    mockSearch = "q=zzz";
    fetchMock.mockResolvedValue(respond(page([])));
    renderPage();
    expect(await screen.findByText(/no events match these filters/i)).toBeInTheDocument();
    await act(async () => { await userEvent.click(screen.getAllByRole("button", { name: /clear/i })[0]); });
    expect(mockReplace).toHaveBeenLastCalledWith("/audit", { scroll: false });
  });

  it("surfaces API errors", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "from must be before to" }) });
    renderPage();
    expect(await screen.findByText("from must be before to")).toBeInTheDocument();
  });

  // Issue #1124: `fetchPage` accepts an AbortSignal and the query hands it its
  // own, so a request the view no longer waits for is cancelled instead of
  // landing late over fresher results.
  it("forwards a cancellable signal and no-store to the audit request", async () => {
    let init: { cache?: string; signal?: AbortSignal } | undefined;
    fetchMock.mockImplementation((_url: string, options?: { cache?: string; signal?: AbortSignal }) => {
      init = options;
      return new Promise(() => {}); // never settles
    });

    const { unmount } = renderPage();
    await waitFor(() => expect(init?.signal).toBeInstanceOf(AbortSignal));
    expect(init?.cache).toBe("no-store");
    expect(init!.signal!.aborted).toBe(false);

    unmount();
    expect(init!.signal!.aborted).toBe(true);
  });

  // Issue #1124 AC: a failed `fetchPage` shows an error alert with a Retry
  // action. Page 2 failing used to wipe the events that had already loaded,
  // because react-query keeps `data` but still reports `isError`.
  it("keeps loaded events and offers Retry when the next page fails", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(page([settings], "CUR1", 2)))
      .mockResolvedValue(respondError("cursor expired"));
    renderPage();
    await screen.findByTestId("audit-row");

    await userEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText(/couldn't load the next page/i)).toBeInTheDocument();
    expect(screen.getByText("cursor expired")).toBeInTheDocument();
    expect(screen.getAllByTestId("audit-row")).toHaveLength(1);
    expect(screen.getByText(/1 event above are the last ones received/i)).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(respond(page([kyb], null, 2)));
    await userEvent.click(screen.getByRole("button", { name: /^retry$/i }));

    await waitFor(() => expect(screen.getAllByTestId("audit-row")).toHaveLength(2));
    // Retry re-requests the page that failed rather than the whole log.
    expect(new URL(fetchMock.mock.calls[2][0], "http://x").searchParams.get("cursor")).toBe("CUR1");
    expect(screen.queryByText(/couldn't load/i)).not.toBeInTheDocument();
  });

  // Issue #1124 AC: rapid navigation must not display the superseded query's
  // rows. `keepPreviousData` serves the *previous* filter's pages while a new
  // key is in flight, so those rows are withheld rather than shown as the
  // answer to the filter the user just picked.
  it("withholds the previous filter's rows while a new filter loads", async () => {
    let resolveFiltered: ((value: unknown) => void) | undefined;
    fetchMock
      .mockResolvedValueOnce(respond(page([settings, kyb], null, 2)))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFiltered = resolve; }));
    renderPage();
    await screen.findAllByTestId("audit-row");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 2 of 2");

    await userEvent.selectOptions(screen.getByLabelText("Entity type"), "MERCHANT");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(screen.queryAllByTestId("audit-row")).toHaveLength(0);
    expect(screen.getByRole("status", { name: /loading audit log/i })).toBeInTheDocument();
    expect(screen.queryByText(/no events match these filters/i)).not.toBeInTheDocument();
    expect(new URL(fetchMock.mock.calls[1][0], "http://x").searchParams.get("entityType")).toBe("MERCHANT");

    await act(async () => { resolveFiltered!(respond(page([kyb], null, 1))); });
    expect(await screen.findAllByTestId("audit-row")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1");
  });
});
