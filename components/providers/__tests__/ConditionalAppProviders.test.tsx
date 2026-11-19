import React from "react";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { ConditionalAppProviders } from "../ConditionalAppProviders";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("../AppProviders", () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-providers">{children}</div>
  ),
}));

describe("ConditionalAppProviders", () => {
  const mockUsePathname = usePathname as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skips AppProviders on unprefixed marketing routes", () => {
    mockUsePathname.mockReturnValue("/about");
    render(
      <ConditionalAppProviders>
        <span>Content</span>
      </ConditionalAppProviders>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.queryByTestId("app-providers")).not.toBeInTheDocument();
  });

  it("skips AppProviders on locale-prefixed marketing routes", () => {
    mockUsePathname.mockReturnValue("/en/about");
    const { rerender } = render(
      <ConditionalAppProviders>
        <span>Content</span>
      </ConditionalAppProviders>
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.queryByTestId("app-providers")).not.toBeInTheDocument();

    mockUsePathname.mockReturnValue("/fr/pricing");
    rerender(
      <ConditionalAppProviders>
        <span>Content</span>
      </ConditionalAppProviders>
    );
    expect(screen.queryByTestId("app-providers")).not.toBeInTheDocument();

    mockUsePathname.mockReturnValue("/pt");
    rerender(
      <ConditionalAppProviders>
        <span>Content</span>
      </ConditionalAppProviders>
    );
    expect(screen.queryByTestId("app-providers")).not.toBeInTheDocument();
  });

  it("mounts AppProviders on protected app routes with or without locale prefix", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    const { rerender } = render(
      <ConditionalAppProviders>
        <span>Content</span>
      </ConditionalAppProviders>
    );

    expect(screen.getByTestId("app-providers")).toBeInTheDocument();

    mockUsePathname.mockReturnValue("/en/dashboard");
    rerender(
      <ConditionalAppProviders>
        <span>Content</span>
      </ConditionalAppProviders>
    );
    expect(screen.getByTestId("app-providers")).toBeInTheDocument();
  });

  it("mounts AppProviders on public non-marketing routes (like /pay)", () => {
    mockUsePathname.mockReturnValue("/en/pay/abc");
    render(
      <ConditionalAppProviders>
        <span>Content</span>
      </ConditionalAppProviders>
    );

    expect(screen.getByTestId("app-providers")).toBeInTheDocument();
  });
});
