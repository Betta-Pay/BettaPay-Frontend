import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  NetworkTooltip,
  pingSorobanRpc,
} from "@/components/ui/network-tooltip";

describe("NetworkTooltip Soroban RPC latency (Issue #870)", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("does not render tooltip when show is false", () => {
    render(
      <NetworkTooltip show={false} message="Offline">
        <button>Submit</button>
      </NetworkTooltip>
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("renders healthy RPC latency in ms with emerald indicator when <= 1500ms", () => {
    render(
      <NetworkTooltip show message="Testnet" latencyMs={120}>
        <button>Status</button>
      </NetworkTooltip>
    );

    const latencyBadge = screen.getByTestId("network-tooltip-latency");
    const indicator = screen.getByTestId("network-tooltip-indicator");

    expect(latencyBadge).toHaveTextContent("120 ms");
    expect(latencyBadge).toHaveClass("text-emerald-400");
    expect(indicator).toHaveClass("bg-emerald-500");
  });

  it("turns indicator and latency text amber when latency exceeds 1500ms", () => {
    render(
      <NetworkTooltip show message="Testnet degraded" latencyMs={1850}>
        <button>Status</button>
      </NetworkTooltip>
    );

    const latencyBadge = screen.getByTestId("network-tooltip-latency");
    const indicator = screen.getByTestId("network-tooltip-indicator");

    expect(latencyBadge).toHaveTextContent("1850 ms");
    expect(latencyBadge).toHaveClass("text-amber-500");
    expect(indicator).toHaveClass("bg-amber-500");
  });

  it("pings Soroban RPC with getHealth JSON-RPC payload and displays round-trip latency", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: { status: "healthy" } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <NetworkTooltip
        show
        network="testnet"
        message="Stellar Testnet"
        pingIntervalMs={0}
      >
        <span>Network Badge</span>
      </NetworkTooltip>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://soroban-testnet.stellar.org",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getHealth",
          }),
        })
      );
      expect(screen.getByTestId("network-tooltip-latency")).toHaveTextContent(
        /\d+ ms/
      );
    });
  });

  it("pingSorobanRpc returns null on network error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("RPC unreachable")) as unknown as typeof fetch;

    const latency = await pingSorobanRpc("https://soroban-testnet.stellar.org");
    expect(latency).toBeNull();
  });
});
