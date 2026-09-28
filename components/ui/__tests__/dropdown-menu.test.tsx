/**
 * components/ui/__tests__/dropdown-menu.test.tsx
 *
 * Guards issue #759: `DropdownMenu` state is no longer strictly local — a
 * dropdown can opt into mirroring its open state into the URL, so refreshing
 * the page (or sharing a deep link) keeps the menu open.
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu";

function setUrl(url: string) {
  window.history.replaceState({}, "", url);
}

function renderMenu(props: {
  urlParam?: string | { key: string; value?: string; hash?: boolean };
}) {
  return render(
    <DropdownMenu urlParam={props.urlParam}>
      <DropdownMenuTrigger render={<button type="button">User menu</button>} />
      <DropdownMenuContent>
        <DropdownMenuItem>Profile Settings</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

beforeEach(() => {
  setUrl("/dashboard");
});

describe("DropdownMenu URL state (issue #759)", () => {
  it("stays local (closed) when no urlParam is provided", async () => {
    setUrl("/dashboard?menu=open");
    const user = userEvent.setup();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">User menu</button>} />
        <DropdownMenuContent>
          <DropdownMenuItem>Profile Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "User menu" }));
    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
    // Ephemeral menus leave the URL untouched.
    expect(window.location.search).toBe("?menu=open");
  });

  it("initialises open from the ?menu=open query param (deep link + refresh)", async () => {
    setUrl("/dashboard?menu=open");

    renderMenu({ urlParam: "menu" });

    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User menu" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("writes the param when opened and removes it when closed", async () => {
    setUrl("/dashboard");
    const user = userEvent.setup();
    renderMenu({ urlParam: "menu" });

    const trigger = screen.getByRole("button", { name: "User menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe("?menu=open"));

    await user.click(screen.getByText("Profile Settings"));
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("keeps unrelated query params intact", async () => {
    setUrl("/dashboard?tab=payments&sort=desc");
    const user = userEvent.setup();
    renderMenu({ urlParam: "menu" });

    await user.click(screen.getByRole("button", { name: "User menu" }));

    await waitFor(() =>
      expect(window.location.search).toBe("?tab=payments&sort=desc&menu=open")
    );
  });

  it("supports a custom open value", async () => {
    setUrl("/dashboard?user-menu=1");
    renderMenu({ urlParam: { key: "user-menu", value: "1" } });

    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
  });

  it("mirrors state into the hash fragment when asked to", async () => {
    setUrl("/dashboard");
    const user = userEvent.setup();
    renderMenu({ urlParam: { key: "menu", hash: true } });

    await user.click(screen.getByRole("button", { name: "User menu" }));

    await waitFor(() => expect(window.location.hash).toBe("#menu=open"));
  });

  it("initialises open from the #menu=open hash fragment", async () => {
    setUrl("/dashboard#menu=open");

    renderMenu({ urlParam: { key: "menu", hash: true } });

    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
  });

  it("follows back/forward navigation", async () => {
    setUrl("/dashboard");
    const user = userEvent.setup();
    renderMenu({ urlParam: "menu" });

    await user.click(screen.getByRole("button", { name: "User menu" }));
    await waitFor(() => expect(window.location.search).toBe("?menu=open"));

    // A back/forward navigation to a URL without the param closes the menu.
    setUrl("/dashboard");
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() =>
      expect(screen.queryByText("Profile Settings")).not.toBeInTheDocument()
    );
  });

  it("still reports open changes to a controlled onOpenChange", async () => {
    setUrl("/dashboard");
    const onOpenChange = jest.fn();
    const user = userEvent.setup();

    render(
      <DropdownMenu urlParam="menu" onOpenChange={onOpenChange}>
        <DropdownMenuTrigger render={<button type="button">User menu</button>} />
        <DropdownMenuContent>
          <DropdownMenuItem>Profile Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    await user.click(screen.getByRole("button", { name: "User menu" }));

    expect(await screen.findByText("Profile Settings")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
    await waitFor(() => expect(window.location.search).toBe("?menu=open"));
  });
});
