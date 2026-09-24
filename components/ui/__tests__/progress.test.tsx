import React from "react"
import { render, screen } from "@testing-library/react"
import { Progress } from "../progress"

describe("Progress component", () => {
  it("renders with correct aria attributes and clamped percentage transform", () => {
    render(<Progress value={50} label="Uploading file..." data-testid="progress-bar" />)

    const progress = screen.getByRole("progressbar")
    expect(progress).toBeInTheDocument()
    expect(progress).toHaveAttribute("aria-valuenow", "50")
    expect(progress).toHaveAttribute("aria-label", "Uploading file...")

    const innerBar = progress.querySelector("div")
    expect(innerBar).toHaveStyle("transform: translateX(-50%)")
    expect(innerBar?.className).toContain("will-change-transform")
    expect(innerBar?.className).toContain("transition-transform")
  })

  it("clamps values outside 0-100 range", () => {
    const { rerender } = render(<Progress value={150} data-testid="progress-bar" />)
    let progress = screen.getByRole("progressbar")
    expect(progress).toHaveAttribute("aria-valuenow", "100")
    expect(progress.querySelector("div")).toHaveStyle("transform: translateX(-0%)")

    rerender(<Progress value={-20} data-testid="progress-bar" />)
    progress = screen.getByRole("progressbar")
    expect(progress).toHaveAttribute("aria-valuenow", "0")
    expect(progress.querySelector("div")).toHaveStyle("transform: translateX(-100%)")
  })
})
