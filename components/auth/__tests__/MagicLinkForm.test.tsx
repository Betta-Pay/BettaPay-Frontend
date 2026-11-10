import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MagicLinkForm } from "../MagicLinkForm";

describe("MagicLinkForm resend countdown timer (#887)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ expiresInSeconds: 900 }),
    } as unknown as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("disables the resend button for 60 seconds after dispatching a magic link and counts down", async () => {
    render(<MagicLinkForm />);

    fireEvent.click(screen.getByRole("button", { name: /email me a magic link/i }));

    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: "merchant@bettapay.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const resendBtn = screen.getByRole("button", { name: /resend link in 60s/i });
    expect(resendBtn).toBeDisabled();

    // Advance 2 seconds -> label displays "Resend link in 58s"
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: /resend link in 58s/i })).toBeDisabled();

    // Clicking while disabled does not trigger another fetch
    fireEvent.click(screen.getByRole("button", { name: /resend link in 58s/i }));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Advance remaining 58 seconds -> timer reaches zero and button becomes clickable
    act(() => {
      jest.advanceTimersByTime(58000);
    });

    const enabledResendBtn = screen.getByRole("button", { name: /^resend link$/i });
    expect(enabledResendBtn).not.toBeDisabled();

    // Clicking Resend dispatches another magic link and restarts the 60s cooldown
    await act(async () => {
      fireEvent.click(enabledResendBtn);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /resend link in 60s/i })).toBeDisabled();
  });
});
