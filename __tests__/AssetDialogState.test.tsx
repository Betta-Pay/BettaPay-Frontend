import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SupportedAsset } from "@/lib/assets/types";

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/lib/hooks/useNotify", () => ({
  useNotify: () => ({
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("@/lib/assets/hooks", () => ({
  useCreateAsset: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateAsset: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAsset: () => ({ mutate: jest.fn(), isPending: false }),
}));

import { AssetDialog } from "@/components/admin/AssetDialog";

const assetA: SupportedAsset = {
  code: "USDC",
  name: "USD Coin",
  issuer: "ISSUER_A",
  decimals: 7,
  enabled: true,
  createdAt: null,
};

const assetB: SupportedAsset = {
  code: "EURC",
  name: "Euro Coin",
  issuer: "ISSUER_B",
  decimals: 6,
  enabled: false,
  createdAt: null,
};

describe("AssetDialog state synchronization (Issue #1120)", () => {
  afterEach(() => jest.clearAllMocks());

  it("populates the edited asset's fields when the asset prop changes", () => {
    const props = { open: true, onOpenChange: jest.fn() };
    const { rerender } = render(<AssetDialog asset={assetA} {...props} />);

    fireEvent.change(screen.getByLabelText(/name \*/i), { target: { value: "Stale edit" } });
    expect(screen.getByLabelText(/name \*/i)).toHaveValue("Stale edit");

    rerender(<AssetDialog asset={assetB} {...props} />);

    expect(screen.getByLabelText(/code \*/i)).toHaveValue("EURC");
    expect(screen.getByLabelText(/name \*/i)).toHaveValue("Euro Coin");
    expect(screen.getByLabelText(/issuer/i)).toHaveValue("ISSUER_B");
    expect(screen.getByLabelText(/decimals \*/i)).toHaveValue(6);
    expect(screen.getByRole("switch", { name: "Enabled" })).toHaveAttribute("aria-checked", "false");
  });

  it("starts from blank defaults when switching from edit mode to create mode", () => {
    const props = { open: true, onOpenChange: jest.fn() };
    const { rerender } = render(<AssetDialog asset={assetA} {...props} />);
    expect(screen.getByLabelText(/code \*/i)).toHaveValue("USDC");

    rerender(<AssetDialog asset={null} {...props} />);

    expect(screen.getByLabelText(/code \*/i)).toHaveValue("");
    expect(screen.getByLabelText(/name \*/i)).toHaveValue("");
    expect(screen.getByLabelText(/issuer/i)).toHaveValue("");
    expect(screen.getByLabelText(/decimals \*/i)).toHaveValue(7);
    expect(screen.getByRole("switch", { name: "Enabled" })).toHaveAttribute("aria-checked", "true");
  });

  it("clears validation errors when the dialog is closed and reopened", () => {
    const onOpenChange = jest.fn();
    const { rerender } = render(<AssetDialog asset={null} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: /add asset/i }));
    expect(screen.getByText("Enter a display name.")).toBeInTheDocument();

    rerender(<AssetDialog asset={null} open={false} onOpenChange={onOpenChange} />);
    rerender(<AssetDialog asset={null} open onOpenChange={onOpenChange} />);

    expect(screen.queryByText("Enter a display name.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/code \*/i)).toHaveValue("");
  });
});
