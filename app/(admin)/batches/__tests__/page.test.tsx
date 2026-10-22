import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminBatchesPage from "../page";
import { detailBatch, summarizeBatch } from "@/lib/batches/derive";
import { getBatchStore, membersOf, resetBatchStore } from "@/lib/batches/store";

let params = new URLSearchParams();
const replace = jest.fn((url: string) => {
  params = new URLSearchParams(url.split("?")[1] ?? "");
});
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/batches",
  useSearchParams: () => params,
}));

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

function wire() {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://x");
    const store = getBatchStore();
    const m = url.pathname.match(/^\/api\/admin\/batches\/(.+)$/);
    if (m) {
      const b = store.batches.find((x) => x.id === m[1])!;
      return ok({ data: detailBatch(b, membersOf(b.id)) });
    }
    const data = store.batches.map((b) => summarizeBatch(b, membersOf(b.id)));
    return ok({ data, total: data.length, nextCursor: null });
  }) as unknown as typeof fetch;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminBatchesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  params = new URLSearchParams();
  replace.mockClear();
  resetBatchStore();
  wire();
});

describe("AdminBatchesPage", () => {
  it("lists batches with derived status", async () => {
    renderPage();
    const row = (await screen.findByRole("button", { name: "Open batch bat_proc" })).closest("tr")!;
    expect(within(row).getByText("Processing")).toBeInTheDocument();
    const done = screen.getByRole("button", { name: "Open batch bat_mixed" }).closest("tr")!;
    expect(within(done).getByText("Completed with failures")).toBeInTheDocument();
  });

  it("opens detail from the row and writes ?batch= to the URL", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Open batch bat_retry" }));
    expect(replace).toHaveBeenCalledWith("/batches?batch=bat_retry");
  });

  it("deep link shows the superseded retry chain and member links", async () => {
    params = new URLSearchParams("batch=bat_retry");
    renderPage();
    const chains = await screen.findByTestId("retry-chains");
    const chain = within(chains).getByRole("list", { name: "Retry chain" });
    const ids = within(chain).getAllByText(/^stl_/).map((e) => e.textContent);
    expect(ids).toEqual(["stl_a1", "stl_a2", "stl_a3"]);
    expect(within(chain).getAllByText("superseded")).toHaveLength(2);
    expect(within(chain).getByText("retry 2")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "stl_a1" });
    expect(link).toHaveAttribute("href", "/admin/transactions?settlement=stl_a1");
    const row = link.closest("tr")!;
    expect(within(row).getByText(/Superseded by/)).toHaveTextContent("stl_a2");
    expect(screen.getByRole("list", { name: "Batch progress" })).toBeInTheDocument();
  });
});
