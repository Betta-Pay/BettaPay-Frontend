/**
 * lib/hooks/__tests__/useRecentCommands.test.ts
 *
 * Issue #1163 — switching role must immediately surface that role's recent
 * commands instead of waiting for a full reload.
 */

import { renderHook } from "@testing-library/react";
import type { CommandRole } from "@/lib/command/actions";
import { useRecentCommands } from "../useRecentCommands";

const key = (role: CommandRole) => `bettapay:command:recent:${role}`;

describe("useRecentCommands role sync (#1163)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads the role-specific list on mount", () => {
    window.localStorage.setItem(key("merchant"), JSON.stringify(["m1", "m2"]));

    const { result } = renderHook(() => useRecentCommands("merchant"));

    expect(result.current.recent).toEqual(["m1", "m2"]);
  });

  it("re-reads storage when the role changes", () => {
    window.localStorage.setItem(key("merchant"), JSON.stringify(["m1", "m2"]));
    window.localStorage.setItem(key("admin"), JSON.stringify(["a1"]));

    const { result, rerender } = renderHook(
      ({ role }: { role: CommandRole }) => useRecentCommands(role),
      { initialProps: { role: "merchant" as CommandRole } },
    );
    expect(result.current.recent).toEqual(["m1", "m2"]);

    rerender({ role: "admin" });

    expect(result.current.recent).toEqual(["a1"]);
  });

  it("degrades gracefully when storage access throws", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });

    try {
      const { result } = renderHook(() => useRecentCommands("admin"));
      expect(result.current.recent).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
