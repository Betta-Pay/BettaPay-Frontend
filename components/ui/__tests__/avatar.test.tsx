import React from "react"
import { render, screen } from "@testing-library/react"
import { Avatar, AvatarFallback } from "../avatar"

describe("Avatar component", () => {
  it("renders fallback initials centered with responsive text scaling for small avatars", () => {
    render(
      <Avatar size="sm" data-testid="avatar-root">
        <AvatarFallback data-testid="avatar-fallback">JD</AvatarFallback>
      </Avatar>
    )

    const fallback = screen.getByTestId("avatar-fallback")
    expect(fallback).toBeInTheDocument()
    expect(fallback.textContent).toBe("JD")
    expect(fallback.className).toContain("leading-none")
    expect(fallback.className).toContain("group-data-[size=sm]/avatar:text-[10px]")
  })

  it("renders default and large avatar fallbacks correctly", () => {
    render(
      <Avatar size="lg" data-testid="avatar-root-lg">
        <AvatarFallback data-testid="avatar-fallback-lg">AB</AvatarFallback>
      </Avatar>
    )

    const fallback = screen.getByTestId("avatar-fallback-lg")
    expect(fallback).toBeInTheDocument()
    expect(fallback.className).toContain("group-data-[size=lg]/avatar:text-base")
  })
})
