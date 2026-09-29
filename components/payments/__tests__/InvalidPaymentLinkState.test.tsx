import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// ── next/navigation ──────────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── next/image ───────────────────────────────────────────────────────────────
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} data-testid="brand-logo" />,
}));

// ── framer-motion ────────────────────────────────────────────────────────────
jest.mock("framer-motion", () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      const MotionDiv = ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) =>
        React.createElement(prop as string, rest, children);
      return MotionDiv;
    },
  }),
}));

// ── lucide-react icons ───────────────────────────────────────────────────────
jest.mock("lucide-react", () => ({
  CloudOff: ({ className }: { className?: string }) => <svg data-testid="icon-CloudOff" className={className} />,
  TimerOff: ({ className }: { className?: string }) => <svg data-testid="icon-TimerOff" className={className} />,
  Unlink: ({ className }: { className?: string }) => <svg data-testid="icon-Unlink" className={className} />,
  LucideIcon: null,
}));

// ── EmptyState (assert on what it receives rather than its internals) ────────
jest.mock("@/components/shared/EmptyState", () => ({
  EmptyState: ({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
  }: {
    icon: React.ComponentType<{ className?: string; "data-testid"?: string }>;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
    secondaryAction?: { label: string; onClick: () => void };
  }) => (
    <div>
      <Icon data-testid="empty-state-icon" />
      <p>{title}</p>
      {description ? <p>{description}</p> : null}
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
      {secondaryAction ? <button onClick={secondaryAction.onClick}>{secondaryAction.label}</button> : null}
    </div>
  ),
}));

import { InvalidPaymentLinkState } from "@/components/payments/InvalidPaymentLinkState";

describe("InvalidPaymentLinkState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the BettaPay brand mark", () => {
    render(<InvalidPaymentLinkState reason="not-found" />);
    expect(screen.getByTestId("brand-logo")).toBeInTheDocument();
    expect(screen.getByText("BettaPay")).toBeInTheDocument();
  });

  it("shows the not-found copy for an unknown link", () => {
    render(<InvalidPaymentLinkState reason="not-found" />);
    expect(screen.getByText("This payment link is no longer valid")).toBeInTheDocument();
    expect(screen.getByTestId("icon-Unlink")).toBeInTheDocument();
  });

  it("shows the expired copy for an expired link", () => {
    render(<InvalidPaymentLinkState reason="expired" />);
    expect(screen.getByText("This payment link has expired")).toBeInTheDocument();
    expect(screen.getByTestId("icon-TimerOff")).toBeInTheDocument();
  });

  it("shows the error copy for a transient failure", () => {
    render(<InvalidPaymentLinkState reason="error" />);
    expect(screen.getByText("We couldn't load this payment link")).toBeInTheDocument();
    expect(screen.getByTestId("icon-CloudOff")).toBeInTheDocument();
  });

  it("navigates home via the only action when no retry is offered", () => {
    render(<InvalidPaymentLinkState reason="not-found" />);
    fireEvent.click(screen.getByRole("button", { name: "Go to homepage" }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("offers retry as primary and home as secondary for transient errors", () => {
    const onRetry = jest.fn();
    render(<InvalidPaymentLinkState reason="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Go to homepage" }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("shows the link id reference when provided", () => {
    render(<InvalidPaymentLinkState reason="not-found" linkId="invalid-id-123" />);
    expect(screen.getByText("invalid-id-123")).toBeInTheDocument();
  });

  it("omits the reference box when no link id is given", () => {
    render(<InvalidPaymentLinkState reason="not-found" />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});
