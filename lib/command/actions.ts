import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  FilePlus2,
  Receipt,
  LogOut,
  Compass,
} from "lucide-react";
import { adminNavItems } from "@/lib/navigation/adminNav";
import { merchantNavItems } from "@/lib/navigation/merchantNav";

export type CommandRole = "merchant" | "admin";

export interface CommandContext {
  navigate: (href: string) => void;
  role: CommandRole;
  logout: () => void;
  switchNetwork: () => void;
}

export interface CommandAction {
  id: string;
  title: string;
  /** Extra terms folded into fuzzy search (route path, synonyms). */
  keywords?: string[];
  /** Keyboard shortcut sequence displayed beside the command item (e.g. `['G', 'D']` or `['Mod', 'N']`). */
  shortcut?: string[];
  group: "Navigation" | "Create" | "Account";
  icon: React.ComponentType<{ className?: string }>;
  /** Roles allowed to see this action. Omitted = all roles. */
  roles?: CommandRole[];
  /** Route to navigate to. Mutually exclusive with `run`. */
  href?: string;
  /** Imperative handler for non-navigation actions. */
  run?: (ctx: CommandContext) => void | Promise<void>;
}

const ROUTE_SHORTCUTS: Record<string, string[]> = {
  "/dashboard": ["G", "D"],
  "/overview": ["G", "D"],
  "/payments": ["G", "P"],
  "/transactions": ["G", "T"],
  "/admin/transactions": ["G", "T"],
  "/settlement": ["G", "S"],
  "/wallet": ["G", "W"],
  "/fx": ["G", "F"],
  "/fx-management": ["G", "F"],
  "/developers": ["G", "V"],
  "/settings": ["G", "E"],
  "/admin/settings": ["G", "E"],
  "/merchants": ["G", "M"],
  "/anchors": ["G", "A"],
  "/compliance": ["G", "C"],
  "/audit": ["G", "L"],
  "/batches": ["G", "B"],
  "/security/ip-scores": ["G", "I"],
  "/webhooks": ["G", "H"],
  "/assets": ["G", "X"],
  "/alerts": ["G", "R"],
};

function resolveNavShortcut(href: string, label: string): string[] {
  if (ROUTE_SHORTCUTS[href]) {
    return ROUTE_SHORTCUTS[href];
  }
  const initial = label.trim().charAt(0).toUpperCase() || "G";
  return ["G", initial];
}

/**
 * Detects whether the current environment is macOS / iOS so modifier badges
 * render `⌘` instead of `Ctrl`.
 */
export function isApplePlatform(platformOverride?: string): boolean {
  const platform =
    platformOverride ??
    (typeof navigator !== "undefined"
      ? navigator.platform || navigator.userAgent || ""
      : "");
  return /Mac|iPod|iPhone|iPad/i.test(platform);
}

/**
 * Formats logical shortcut tokens (such as `'Mod'`, `'Cmd'`, `'Ctrl'`, `'Shift'`, `'Alt'`)
 * into platform-appropriate display labels (`⌘` on macOS, `Ctrl` on Windows/Linux).
 */
export function formatShortcutKeys(
  shortcut: readonly string[] | undefined,
  isMac: boolean = isApplePlatform(),
): string[] {
  if (!shortcut || shortcut.length === 0) return [];
  return shortcut.map((key) => {
    const normalized = key.trim().toLowerCase();
    if (normalized === "mod" || normalized === "cmd" || normalized === "meta") {
      return isMac ? "⌘" : "Ctrl";
    }
    if (normalized === "ctrl" || normalized === "control") {
      return "Ctrl";
    }
    if (normalized === "shift") {
      return isMac ? "⇧" : "Shift";
    }
    if (normalized === "alt" || normalized === "option" || normalized === "opt") {
      return isMac ? "⌥" : "Alt";
    }
    return key.toUpperCase();
  });
}

function navActions(
  items: readonly { href: string; label: string }[],
  role: CommandRole,
): CommandAction[] {
  return items.map((item) => ({
    id: `nav:${role}:${item.href}`,
    title: `Go to ${item.label}`,
    keywords: [item.label, item.href.replace(/[/-]/g, " ")],
    shortcut: resolveNavShortcut(item.href, item.label),
    group: "Navigation" as const,
    icon: Compass as LucideIcon,
    roles: [role],
    href: item.href,
  }));
}

const staticActions: CommandAction[] = [
  {
    id: "create:payment-link",
    title: "Create payment link",
    keywords: ["new", "invoice", "charge", "pay"],
    shortcut: ["Mod", "N"],
    group: "Create",
    icon: FilePlus2 as LucideIcon,
    roles: ["merchant"],
    href: "/payments?new=1",
  },
  {
    id: "create:quote",
    title: "Request a quote",
    keywords: ["fx", "rate", "conversion", "estimate"],
    shortcut: ["Mod", "Q"],
    group: "Create",
    icon: Receipt as LucideIcon,
    roles: ["merchant"],
    href: "/fx?quote=1",
  },
  {
    id: "account:switch-network",
    title: "Switch network (testnet / mainnet)",
    keywords: ["stellar", "environment", "testnet", "mainnet", "public"],
    shortcut: ["Mod", "Shift", "N"],
    group: "Account",
    icon: ArrowLeftRight as LucideIcon,
    run: (ctx) => ctx.switchNetwork(),
  },
  {
    id: "account:logout",
    title: "Log out",
    keywords: ["sign out", "exit"],
    shortcut: ["Mod", "Shift", "L"],
    group: "Account",
    icon: LogOut as LucideIcon,
    run: (ctx) => ctx.logout(),
  },
];

/** All actions available to `role`, navigation routes first. */
export function actionsForRole(role: CommandRole): CommandAction[] {
  const nav =
    role === "admin"
      ? navActions(adminNavItems, "admin")
      : navActions(merchantNavItems, "merchant");

  const rest = staticActions.filter((a) => !a.roles || a.roles.includes(role));

  return [...nav, ...rest];
}
