/**
 * __tests__/TransactionsPage.test.tsx
 *
 * Verifies the Transactions page and its CSV export (shared `ExportMenu`):
 *  - Export button is disabled + aria-disabled when offline, enabled online
 *  - NetworkTooltip renders the offline message only when offline
 *  - Clicking export downloads a CSV of the FULL filtered dataset and toasts
 *  - The page renders its search / filters / empty state
 *
 * The page is data-backed through `usePayments` (React Query), which is
 * mocked here so no network or QueryClient provider is required.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module mocks — declared before imports that depend on them
// ---------------------------------------------------------------------------

const mockIsOnline = jest.fn<boolean, []>().mockReturnValue(true);

// ── offline store ────────────────────────────────────────────────────────────
jest.mock("@/lib/store/offlineStore", () => ({
  useOfflineStore: (selector: (state: { isOnline: boolean }) => unknown) =>
    selector({ isOnline: mockIsOnline() }),
}));

// ── API hooks ────────────────────────────────────────────────────────────────
const mockPayments = [
  {
    id: 'pay_1',
    txHash: '1a2b3c4d',
    payerAddress: 'GBX...4Q3',
    merchantId: 'm_1',
    amountUsdc: 1500,
    amountNgn: 2325000,
    fxRate: 1550,
    status: 'completed',
    source: 'Payment Link',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'pay_2',
    txHash: '2b3c4d5e',
    payerAddress: 'GCY...8R2',
    merchantId: 'm_1',
    amountUsdc: 45.5,
    amountNgn: 70525,
    fxRate: 1550,
    status: 'pending',
    source: 'QR Code',
    createdAt: '2026-08-02T10:00:00Z',
  },
];

jest.mock("@/lib/api/hooks", () => ({
  usePayments: () => ({
    data: mockPayments,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

// ── useDebounceValue (immediate passthrough) ────────────────────────────────
jest.mock("usehooks-ts", () => ({
  useDebounceValue: (value: string) => [value],
}));

// ── react-virtual ────────────────────────────────────────────────────────────
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

// ── TransactionDrawer ────────────────────────────────────────────────────────
jest.mock("@/components/transactions/TransactionDrawer", () => ({
  TransactionDrawer: () => null,
}));

// ── useNotify ────────────────────────────────────────────────────────────────
jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: jest.fn(),
}));
import { useNotify } from "@/lib/hooks/useNotify";
const mockUseNotify = useNotify as jest.Mock;

// ── NetworkTooltip (stub preserving data-testid) ─────────────────────────────
// The page imports NetworkTooltip through the `@/components/ui` barrel, which
// re-exports this module — mock the underlying module so the barrel picks it up.
jest.mock("@/components/ui/network-tooltip", () => ({
  NetworkTooltip: ({
    show,
    message = "Export unavailable while offline.",
    children,
  }: {
    show: boolean;
    message?: string;
    children: React.ReactNode;
  }) => (
    <>
      {children}
      {show && (
        <div data-testid="network-tooltip-content" role="tooltip">
          {message}
        </div>
      )}
    </>
  ),
  OFFLINE_MESSAGE: "Export unavailable while offline.",
}));

// ── next/navigation (not used in page but required by deps) ──────────────────
jest.mock("next/navigation", () => ({
  usePathname: () => "/transactions",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// ── lucide-react icons ────────────────────────────────────────────────────────
jest.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return {
    Search: icon("Search"),
    Download: icon("Download"),
    Filter: icon("Filter"),
    SearchX: icon("SearchX"),
    ExternalLink: icon("ExternalLink"),
    Loader2: icon("Loader2"),
    ArrowUp: icon("ArrowUp"),
    ArrowDown: icon("ArrowDown"),
    ArrowUpDown: icon("ArrowUpDown"),
  };
});

// ── @/lib/utils ───────────────────────────────────────────────────────────────
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// ── @/lib/utils/format ────────────────────────────────────────────────────────
jest.mock("@/lib/utils/format", () => ({
  formatDate: (d: string | Date) => String(d),
  truncateAddress: (a: string) => a,
}));

// ── @/components/ui/* ─────────────────────────────────────────────────────────
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// ── @/components/ui/select (base-ui Select crashes in jsdom) ─────────────────
jest.mock("@/components/ui/select", () => {
  const passthrough =
    (Tag: string) =>
    ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(Tag, { ...rest }, children);
  return {
    Select: passthrough("div"),
    SelectTrigger: passthrough("button"),
    SelectContent: passthrough("div"),
    SelectItem: passthrough("div"),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder}</span>
    ),
  };
});

jest.mock("@/components/ui/table", () => {
  const passthrough =
    (Tag: string) =>
    ({ children, className, ...rest }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(Tag, { className, ...rest }, children);
  return {
    Table: passthrough("table"),
    TableHeader: passthrough("thead"),
    TableBody: passthrough("tbody"),
    TableRow: passthrough("tr"),
    TableHead: passthrough("th"),
    TableCell: passthrough("td"),
  };
});

// ── shared components ─────────────────────────────────────────────────────────
jest.mock("@/components/shared/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));
jest.mock("@/components/shared/CopyAddress", () => ({
  CopyAddress: ({ address }: { address: string }) => <span>{address}</span>,
}));
jest.mock("@/components/shared/CurrencyDisplay", () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));
jest.mock("@/components/shared/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

// ── Browser download plumbing (for the CSV export tests) ─────────────────────
let lastBlob: Blob | null = null;
const createObjectURL = jest.fn((blob: Blob) => {
  lastBlob = blob;
  return "blob:mock";
});
const revokeObjectURL = jest.fn();
beforeAll(() => {
  Object.defineProperty(URL, "createObjectURL", { writable: true, value: createObjectURL });
  Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: revokeObjectURL });
});

async function readBlobText(blob: Blob): Promise<string> {
  // jsdom's Blob lacks .text()/.arrayBuffer(), and FileReader.readAsText
  // strips a leading BOM — read as an ArrayBuffer and decode manually with
  // ignoreBOM so the test can assert on the BOM itself.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new TextDecoder("utf-8", { ignoreBOM: true }).decode(reader.result as ArrayBuffer));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

// ---------------------------------------------------------------------------
// Component import — after all mocks
// ---------------------------------------------------------------------------

import TransactionsPage from "@/app/(merchant)/transactions/page";

function makeNotify() {
  return { success: jest.fn(), error: jest.fn(), info: jest.fn(), silent: jest.fn() };
}

let notify: ReturnType<typeof makeNotify>;

const renderPage = () => render(<TransactionsPage />);

const getExportButton = () =>
  document.getElementById("export-csv-btn") as HTMLButtonElement;

beforeEach(() => {
  jest.clearAllMocks();
  lastBlob = null;
  notify = makeNotify();
  mockUseNotify.mockReturnValue(notify);
});

describe("TransactionsPage — Export CSV (offline)", () => {
  beforeEach(() => {
    mockIsOnline.mockReturnValue(false);
  });

  it("renders a disabled Export CSV button when offline", () => {
    renderPage();
    expect(getExportButton()).toBeDisabled();
  });

  it("has aria-disabled=true on the button when offline", () => {
    renderPage();
    expect(getExportButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("renders NetworkTooltip with the offline message", () => {
    renderPage();
    const tooltip = screen.getByTestId("network-tooltip-content");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("Export unavailable while offline.");
  });

  it("tooltip has role=tooltip", () => {
    renderPage();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("clicking the disabled button does NOT trigger the export", () => {
    renderPage();
    const btn = getExportButton();
    expect(() => fireEvent.click(btn)).not.toThrow();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

describe("TransactionsPage — Export CSV (online)", () => {
  beforeEach(() => {
    mockIsOnline.mockReturnValue(true);
  });

  it("renders an enabled Export CSV button when online", () => {
    renderPage();
    expect(getExportButton()).not.toBeDisabled();
  });

  it("has aria-disabled=false when online", () => {
    renderPage();
    const btn = getExportButton();
    expect(btn.getAttribute("aria-disabled")).toBe("false");
  });

  it("does NOT render the offline NetworkTooltip when online", () => {
    renderPage();
    expect(
      screen.queryByTestId("network-tooltip-content")
    ).not.toBeInTheDocument();
  });

  it("clicking the button when online does not throw", () => {
    renderPage();
    expect(() => fireEvent.click(getExportButton())).not.toThrow();
  });
});

describe("TransactionsPage — CSV export downloads the filtered dataset", () => {
  beforeEach(() => {
    mockIsOnline.mockReturnValue(true);
  });

  it("exports every row of the dataset and toasts the row count", async () => {
    renderPage();
    fireEvent.click(getExportButton());

    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("Exported 2 rows"));

    const csv = await readBlobText(lastBlob as Blob);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain('"Date","Payer","TxHash","Source","AmountUSDC","AmountNGN","Status"');
    expect(csv).toContain('"2026-08-01T10:00:00Z","GBX...4Q3","1a2b3c4d","Payment Link",1500,2325000,"completed"');
    expect(csv).toContain('"2026-08-02T10:00:00Z","GCY...8R2","2b3c4d5e","QR Code",45.5,70525,"pending"');
  });
});

describe("TransactionsPage — connectivity transitions", () => {
  it("button transitions from disabled (offline) to enabled (online) on re-render", () => {
    mockIsOnline.mockReturnValue(false);
    const { rerender } = render(<TransactionsPage />);
    expect(getExportButton()).toBeDisabled();

    mockIsOnline.mockReturnValue(true);
    rerender(<TransactionsPage />);
    expect(getExportButton()).not.toBeDisabled();
  });

  it("tooltip disappears when connectivity is restored", () => {
    mockIsOnline.mockReturnValue(false);
    const { rerender } = render(<TransactionsPage />);
    expect(screen.getByTestId("network-tooltip-content")).toBeInTheDocument();

    mockIsOnline.mockReturnValue(true);
    rerender(<TransactionsPage />);
    expect(
      screen.queryByTestId("network-tooltip-content")
    ).not.toBeInTheDocument();
  });
});

describe("TransactionsPage — existing functionality", () => {
  beforeEach(() => {
    mockIsOnline.mockReturnValue(true);
  });

  it("renders the Transactions heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /transactions/i })
    ).toBeInTheDocument();
  });

  it("renders the search input", () => {
    renderPage();
    expect(
      screen.getByPlaceholderText(/search by hash, address, or label/i)
    ).toBeInTheDocument();
  });

  it("renders rows from the payments dataset", () => {
    renderPage();
    expect(screen.getByText("GBX...4Q3")).toBeInTheDocument();
    expect(screen.getByText("GCY...8R2")).toBeInTheDocument();
  });
});
