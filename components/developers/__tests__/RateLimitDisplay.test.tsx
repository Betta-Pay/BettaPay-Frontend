import { act, render, screen, waitFor } from "@testing-library/react";

import { RateLimitDisplay } from "../RateLimitDisplay";

describe("RateLimitDisplay", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("shows header values, counts down, and warns at 80% usage", async () => {
    const now = new Date("2026-07-23T12:00:00Z");
    jest.useFakeTimers();
    jest.setSystemTime(now);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "20",
        "X-RateLimit-Reset": String(Math.floor(now.getTime() / 1000) + 60),
      }),
    });

    render(<RateLimitDisplay />);

    await waitFor(() => expect(screen.getByText("20")).toBeInTheDocument());
    expect(screen.getByText("00:01:00")).toBeInTheDocument();
    expect(screen.getByText("80% used")).toBeInTheDocument();
    expect(screen.getByText("Approaching rate limit")).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText("00:00:59")).toBeInTheDocument();
  });
});
