/**
 * __tests__/CopyAddress.test.tsx
 *
 * Verifies:
 *  - Truncated address is still rendered in default mode
 *  - Tooltip content exposes the full address (via aria or data attribute)
 *  - aria-label on the trigger element contains the full address
 *  - Copy functionality works (clipboard + toast)
 *  - showIconOnly variant renders a button with the correct aria-label
 *  - Keyboard Enter/Space triggers the copy handler on the default variant
 *  - truncate=false renders the full address without truncation
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Clipboard API
const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(global.navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// lucide-react icons — lightweight stubs
jest.mock("lucide-react", () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return { Copy: icon("Copy"), Check: icon("Check") };
});

// @/lib/utils
jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(" "),
}));

// @/lib/utils/format
jest.mock("@/lib/utils/format", () => ({
  truncateAddress: (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  },
}));

// @/components/ui/button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    "aria-label": ariaLabel,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label"?: string }) => (
    <button onClick={onClick} className={className} aria-label={ariaLabel} {...rest}>
      {children}
    </button>
  ),
}));

// @/components/ui/tooltip — use a simple but functional stub
// The stub renders children so interaction tests work without @base-ui internals.
jest.mock("@/components/ui/tooltip", () => {
  const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  TooltipProvider.displayName = "TooltipProvider";

  const Tooltip = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
  Tooltip.displayName = "Tooltip";

  const TooltipTrigger = ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    void asChild;
    return <>{children}</>;
  };
  TooltipTrigger.displayName = "TooltipTrigger";

  const TooltipContent = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content" role="tooltip">
      {children}
    </div>
  );
  TooltipContent.displayName = "TooltipContent";

  return { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
});

// ---------------------------------------------------------------------------
// Component import (after mocks)
// ---------------------------------------------------------------------------

import { CopyAddress } from "@/components/shared/CopyAddress";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FULL_ADDRESS = "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXQ3";
const TRUNCATED = "GBXXXX...XQ3"; // matches truncateAddress mock for this string

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderDefault = (props: Partial<React.ComponentProps<typeof CopyAddress>> = {}) =>
  render(<CopyAddress address={FULL_ADDRESS} {...props} />);

// ---------------------------------------------------------------------------
// Tests: Default (full-width) variant
// ---------------------------------------------------------------------------

describe("CopyAddress — default variant", () => {
  it("renders the truncated address", () => {
    renderDefault();
    // truncateAddress('GBXXXXX...Q3') produces 'GBXXXX...XXQ3'
    const span = screen.getByText(/GBXXXX\.\.\..*Q3/i);
    expect(span).toBeInTheDocument();
  });

  it("does NOT render the raw full address as visible text when truncate=true", () => {
    renderDefault();
    // The span should show the truncated form, not the full address as one chunk
    const spans = screen.getAllByText((_, el) => el?.tagName === "SPAN");
    spans.forEach((el) => {
      expect(el.textContent).not.toBe(FULL_ADDRESS);
    });
  });

  it("tooltip content contains the full address", () => {
    renderDefault();
    const tooltip = screen.getByTestId("tooltip-content");
    expect(tooltip).toHaveTextContent(FULL_ADDRESS);
  });

  it("trigger element has aria-label containing the full address", () => {
    renderDefault();
    // The div trigger wraps the address; its aria-label should contain the full address
    const trigger = screen.getByRole("button", {
      name: new RegExp(`Wallet address: ${FULL_ADDRESS.substring(0, 10)}`, "i"),
    });
    expect(trigger).toHaveAttribute("aria-label", `Wallet address: ${FULL_ADDRESS}`);
  });

  it("copies the full address to clipboard on click", async () => {
    mockWriteText.mockClear();
    renderDefault();
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    await waitFor(() => expect(mockWriteText).toHaveBeenCalledWith(FULL_ADDRESS));
  });

  it("shows a success toast after copying", async () => {
    (toast.success as jest.Mock).mockClear();
    renderDefault();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Address copied to clipboard")
    );
  });

  it("copies on Enter key press", async () => {
    mockWriteText.mockClear();
    renderDefault();
    const trigger = screen.getByRole("button");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    await waitFor(() => expect(mockWriteText).toHaveBeenCalledWith(FULL_ADDRESS));
  });

  it("copies on Space key press", async () => {
    mockWriteText.mockClear();
    renderDefault();
    const trigger = screen.getByRole("button");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: " " });
    await waitFor(() => expect(mockWriteText).toHaveBeenCalledWith(FULL_ADDRESS));
  });
});

// ---------------------------------------------------------------------------
// Tests: truncate=false
// ---------------------------------------------------------------------------

describe("CopyAddress — truncate=false", () => {
  it("renders the full address as visible text", () => {
    const { container } = renderDefault({ truncate: false });
    // Both the <span> and the tooltip div contain the full address — scope to span
    const span = container.querySelector("span.font-mono");
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent(FULL_ADDRESS);
  });

  it("tooltip still contains the full address", () => {
    renderDefault({ truncate: false });
    const tooltip = screen.getByTestId("tooltip-content");
    expect(tooltip).toHaveTextContent(FULL_ADDRESS);
  });
});

// ---------------------------------------------------------------------------
// Tests: showIconOnly variant
// ---------------------------------------------------------------------------

describe("CopyAddress — showIconOnly variant", () => {
  const renderIconOnly = (
    props: Partial<React.ComponentProps<typeof CopyAddress>> = {}
  ) => render(<CopyAddress address={FULL_ADDRESS} showIconOnly {...props} />);

  it("renders a button element", () => {
    renderIconOnly();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("button has aria-label containing the full address", () => {
    renderIconOnly();
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      `Wallet address: ${FULL_ADDRESS}`
    );
  });

  it("tooltip content contains the full address", () => {
    renderIconOnly();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent(FULL_ADDRESS);
  });

  it("copies the full address to clipboard on click", async () => {
    mockWriteText.mockClear();
    renderIconOnly();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mockWriteText).toHaveBeenCalledWith(FULL_ADDRESS));
  });

  it("shows success toast after copying", async () => {
    (toast.success as jest.Mock).mockClear();
    renderIconOnly();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Address copied to clipboard")
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: Copy failure
// ---------------------------------------------------------------------------

describe("CopyAddress — clipboard failure", () => {
  it("shows error toast when clipboard write fails", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("permission denied"));
    (toast.error as jest.Mock).mockClear();
    renderDefault();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to copy address")
    );
  });
});

describe("CopyAddress — timeout and cleanup", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resets copied feedback after 2000ms", async () => {
    renderDefault();
    const btn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByTestId("icon-Check")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.queryByTestId("icon-Check")).not.toBeInTheDocument();
    expect(screen.getByTestId("icon-Copy")).toBeInTheDocument();
  });

  it("clears timeout on unmount without throwing errors or updating unmounted state", async () => {
    const { unmount } = renderDefault();
    const btn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByTestId("icon-Check")).toBeInTheDocument();

    unmount();
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(2500);
      });
    }).not.toThrow();
  });

  it("resets timer on rapid clicks", async () => {
    renderDefault();
    const btn = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(btn);
    });
    expect(screen.getByTestId("icon-Check")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId("icon-Check")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(btn);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("icon-Check")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("icon-Check")).not.toBeInTheDocument();
  });
});
