import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SettlementConfirmation } from "@/components/settlement/SettlementConfirmation";

describe("SettlementConfirmation double submission prevention", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("disables the confirm button until the confirmation checkbox is checked", () => {
    render(<SettlementConfirmation isOpen={true} onClose={jest.fn()} />);

    const confirmBtn = screen.getByRole("button", { name: /confirm settlement/i });
    expect(confirmBtn).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(confirmBtn).not.toBeDisabled();
  });

  it("prevents double/triple submissions on rapid consecutive clicks and immediately renders pending spinner", async () => {
    let resolveConfirm!: () => void;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
    );

    render(
      <SettlementConfirmation
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const confirmBtn = screen.getByRole("button", { name: /confirm settlement/i });

    // Rapid triple click in the same synchronous tick
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);

    // Button immediately transitions to disabled pending state with spinner
    const processingBtn = screen.getByRole("button", { name: /processing/i });
    expect(processingBtn).toBeDisabled();
    expect(screen.getByTestId("confirm-settlement-spinner")).toBeInTheDocument();

    // Subsequent click while pending is also ignored
    fireEvent.click(processingBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConfirm();
    });

    expect(screen.getByText(/processing settlement/i)).toBeInTheDocument();
  });

  it("locks submission synchronously and transitions to processing spinner when no custom onConfirm is provided", () => {
    render(<SettlementConfirmation isOpen={true} onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole("checkbox"));
    const confirmBtn = screen.getByRole("button", { name: /confirm settlement/i });

    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/processing settlement/i)).toBeInTheDocument();
    const processingBtn = screen.getByRole("button", { name: /processing/i });
    expect(processingBtn).toBeDisabled();
  });

  it("releases the submission lock if onConfirm fails", async () => {
    const onConfirm = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network timeout"));

    render(
      <SettlementConfirmation
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));
    const confirmBtn = screen.getByRole("button", { name: /confirm settlement/i });

    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText(/settlement failed/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/network timeout/i).length).toBeGreaterThan(0);
  });
});
