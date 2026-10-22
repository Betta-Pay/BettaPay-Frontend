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
});
