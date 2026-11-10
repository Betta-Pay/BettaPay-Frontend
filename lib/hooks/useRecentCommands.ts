"use client";

import { useCallback, useState } from "react";
import type { CommandRole } from "@/lib/command/actions";

export const MAX_RECENT_COMMANDS = 10;
export const MAX_RECENT = MAX_RECENT_COMMANDS;

export const getRecentCommandsStorageKey = (role: CommandRole) =>
  `bettapay:command:recent:${role}`;

function sanitizeRecentList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= MAX_RECENT_COMMANDS) break;
  }
  return result;
}

function read(role: CommandRole): string[] {
  try {
    const raw = window.localStorage.getItem(getRecentCommandsStorageKey(role));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return sanitizeRecentList(parsed);
  } catch {
    return [];
  }
}

/**
 * Per-role most-recently-used command ids, persisted to localStorage
 * and bounded to `MAX_RECENT_COMMANDS` (10) entries (issue #910).
 */
export function useRecentCommands(role: CommandRole) {
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : read(role),
  );

  const push = useCallback(
    (id: string) => {
      const normalized = id.trim();
      if (!normalized) return;

      setRecent((prev) => {
        const next = [normalized, ...prev.filter((x) => x !== normalized)].slice(
          0,
          MAX_RECENT_COMMANDS,
        );
        try {
          window.localStorage.setItem(
            getRecentCommandsStorageKey(role),
            JSON.stringify(next),
          );
        } catch {
          // storage unavailable (private mode / quota) — keep in-memory only
        }
        return next;
      });
    },
    [role],
  );

  const clear = useCallback(() => {
    setRecent([]);
    try {
      window.localStorage.removeItem(getRecentCommandsStorageKey(role));
    } catch {
      // ignore storage errors
    }
  }, [role]);

  return { recent, push, clear };
}
