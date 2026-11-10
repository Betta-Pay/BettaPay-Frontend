import React from "react";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton prefers-reduced-motion accessibility (Issue #871)", () => {
  it("includes motion-reduce:animate-none and static fallback contrast classes", () => {
    render(<Skeleton data-testid="skeleton-el" />);

    const skeleton = screen.getByTestId("skeleton-el");
    expect(skeleton).toHaveAttribute("data-slot", "skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveClass("animate-pulse");
    expect(skeleton).toHaveClass("motion-reduce:animate-none");
    expect(skeleton).toHaveClass("bg-muted-foreground/10");
    expect(skeleton).toHaveClass("motion-reduce:bg-muted-foreground/20");
  });

  it("merges custom className and forwards HTML attributes", () => {
    render(
      <Skeleton
        data-testid="custom-skeleton"
        className="h-8 w-48 rounded-xl"
        aria-label="Loading profile"
      />
    );

    const skeleton = screen.getByTestId("custom-skeleton");
    expect(skeleton).toHaveClass("h-8", "w-48", "rounded-xl");
    expect(skeleton).toHaveClass("motion-reduce:animate-none");
    expect(skeleton).toHaveAttribute("aria-label", "Loading profile");
  });
});
