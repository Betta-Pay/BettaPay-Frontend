"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import { ROUTES } from "@/lib/navigation/routes";
import {
  actionsForRole,
  type CommandAction,
  type CommandContext,
  type CommandRole,
} from "@/lib/command/actions";
import { fuzzyRank } from "@/lib/command/fuzzy";
import { COMMAND_PALETTE_OPEN_EVENT } from "@/lib/command/open";
import { useRecentCommands } from "@/lib/hooks/useRecentCommands";

interface CommandPaletteProps {
  /** Which action set to expose. Admin layouts pass "admin". */
  role: CommandRole;
}

/**
 * Global launcher opened with ⌘K / Ctrl+K or the topbar button (issue #459).
 *
 * - Focus moves into the input on open; Esc closes and restores focus to the
 *   element that had it before.
 * - Fully keyboard operable: ↑/↓ move the selection, Enter runs it, Home/End
 *   jump. The active row id is mirrored via `aria-activedescendant` and the
 *   result count is announced in a live region.
 * - Actions are role-filtered by `actionsForRole`, so admins never see
 *   merchant-only actions and vice-versa.
 */
export function CommandPalette({ role }: CommandPaletteProps) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const network = useWalletStore((s) => s.network);
  const setNetwork = useWalletStore((s) => s.setNetwork);
  const { recent, push: pushRecent } = useRecentCommands(role);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const ctx: CommandContext = useMemo(
    () => ({
      role,
      navigate: (href) => router.push(href),
      logout: () => {
        logout();
        router.push(ROUTES.LOGIN);
      },
      switchNetwork: () => setNetwork(network === "testnet" ? "public" : "testnet"),
    }),
    [role, router, logout, network, setNetwork],
  );

  const allActions = useMemo(() => actionsForRole(role), [role]);

  // Ranked, flat list of what to render. Empty query -> recents first, then
  // everything in registry order. Non-empty -> fuzzy-ranked.
  const results = useMemo<CommandAction[]>(() => {
    const ranked = fuzzyRank(query, allActions, (a) => [
      a.title,
      ...(a.keywords ?? []),
    ]).map((r) => r.item);

    if (query.trim() === "" && recent.length > 0) {
      const byId = new Map(allActions.map((a) => [a.id, a]));
      const recentActions = recent
        .map((id) => byId.get(id))
        .filter((a): a is CommandAction => Boolean(a));
      const recentIds = new Set(recentActions.map((a) => a.id));
      return [...recentActions, ...ranked.filter((a) => !recentIds.has(a.id))];
    }
    return ranked;
  }, [query, allActions, recent]);

  const showRecentHeading = query.trim() === "" && recent.length > 0;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    // Restore focus to wherever it was (accessibility requirement).
    restoreFocusRef.current?.focus?.();
    restoreFocusRef.current = null;
  }, []);

  const run = useCallback(
    (action: CommandAction | undefined) => {
      if (!action) return;
      pushRecent(action.id);
      close();
      if (action.href) ctx.navigate(action.href);
      else void action.run?.(ctx);
    },
    [ctx, pushRecent, close],
  );

  // --- Global open shortcut + custom event -------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
        setOpen((v) => !v);
      }
    };
    const onOpenEvent = () => {
      restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvent);
    };
  }, []);

  // Focus the input whenever the palette opens.
  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      // rAF so the element exists and is focusable.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Keep the selection in range and scrolled into view.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) =>
          results.length ? (i - 1 + results.length) % results.length : 0,
        );
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(Math.max(0, results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        run(results[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search actions, pages…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={
              results[activeIndex] ? `cmd-opt-${results[activeIndex].id}` : undefined
            }
            aria-autocomplete="list"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Commands"
          className="max-h-[50vh] overflow-y-auto p-1.5"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching commands
            </p>
          ) : (
            results.map((action, index) => {
              const Icon = action.icon;
              const isActive = index === activeIndex;
              return (
                <div key={action.id}>
                  {showRecentHeading && index === 0 && (
                    <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent
                    </p>
                  )}
                  <button
                    type="button"
                    id={`cmd-opt-${action.id}`}
                    data-index={index}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => run(action)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">{action.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {action.group}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {results.length} command{results.length === 1 ? "" : "s"} available
        </p>
      </div>
    </div>
  );
}

export default CommandPalette;
