import React from 'react';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WalletModal } from '../WalletModal';
import { useWalletStore, type WalletState } from '@/lib/store/walletStore';
import { isWalletConnectConfigured } from '@/lib/stellar/walletconnect';
import { createMockFreighterStore } from '@/lib/store/__mocks__/freighterProvider';
import { WCAG_AA_NORMAL, contrastRatio } from '@/lib/a11y/contrast';

jest.mock('@/lib/stellar/walletconnect', () => ({
  getWalletConnectClient: jest.fn(),
  resetWalletConnectClient: jest.fn(),
  isWalletConnectConfigured: jest.fn(),
  normalizeWalletNetwork: jest.fn((network: string) => network),
}));

jest.mock('../WalletConnectModal', () => ({
  WalletConnectModal: ({ open }: { open: boolean }) => (
    <div data-testid="wallet-connect-modal" data-open={String(open)} />
  ),
}));

/**
 * Every colour the modal paints comes from a CSS custom property, so the audit
 * reads the declarations out of `app/globals.css` rather than a copy — the same
 * approach as `__tests__/status-contrast.test.ts` (issue #460). A token that is
 * retuned below AA fails CI instead of quietly becoming unreadable.
 */
const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

type Theme = "light" | "dark";

function readThemeVars(theme: Theme): Record<string, string> {
  const start = css.indexOf(theme === "light" ? ":root {" : ".dark {");
  expect(start).toBeGreaterThanOrEqual(0);

  const open = css.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const vars: Record<string, string> = {};
  for (const match of css.slice(open + 1, end).matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[match[1]] = match[2];
  }
  return vars;
}

const themes: Record<Theme, Record<string, string>> = {
  light: readThemeVars("light"),
  dark: readThemeVars("dark"),
};

/**
 * `[what, text var, surface var, threshold]`.
 *
 * The solid retry buttons are listed as `(--tone-bg on --tone-fg)`; contrast is
 * symmetric, so that single ratio also covers their hover, which swaps the two.
 */
const PAIRS: [string, string, string, number][] = [
  ["panel heading / provider button label", "--card-foreground", "--card", WCAG_AA_NORMAL],
  ["lede copy and close icon", "--muted-foreground", "--card", WCAG_AA_NORMAL],
  ["provider label on its hover fill", "--card-foreground", "--muted", WCAG_AA_NORMAL],
  ["cancel button on the footer", "--card-foreground", "--muted", WCAG_AA_NORMAL],
  ["cancel button hovered", "--foreground", "--muted", WCAG_AA_NORMAL],
  ["provider network chip", "--secondary-foreground", "--secondary", WCAG_AA_NORMAL],
  ["warning alert body", "--status-warn-fg", "--status-warn-bg", WCAG_AA_NORMAL],
  ["warning alert heading on the card", "--status-warn-fg", "--card", WCAG_AA_NORMAL],
  ["warning solid button (and its hover)", "--status-warn-bg", "--status-warn-fg", WCAG_AA_NORMAL],
  ["danger alert body", "--status-down-fg", "--status-down-bg", WCAG_AA_NORMAL],
  ["danger solid button (and its hover)", "--status-down-bg", "--status-down-fg", WCAG_AA_NORMAL],
  ["WalletConnect configuration notice", "--status-warn-fg", "--card", WCAG_AA_NORMAL],
];

function classesIn(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[class]")).flatMap(
    (el) => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)
  );
}

/** `ConnectError` is module-private in the store; name it through the state. */
type StoreConnectError = NonNullable<WalletState['connectError']>;

function setConnectError(connectError: StoreConnectError | null) {
  useWalletStore.setState({
    ...createMockFreighterStore(),
    walletModalOpen: true,
    walletConnectPending: false,
    network: "testnet",
    connectError,
  });
}

describe("WalletModal dark mode (issue #1137)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isWalletConnectConfigured).mockReturnValue(true);
    setConnectError(null);
  });

  describe.each<Theme>(["light", "dark"])("%s theme contrast", (theme) => {
    const vars = themes[theme];

    it.each(PAIRS)("%s meets WCAG AA", (label, fgVar, bgVar, threshold) => {
      expect(vars[fgVar]).toBeDefined();
      expect(vars[bgVar]).toBeDefined();
      expect(contrastRatio(vars[fgVar], vars[bgVar])).toBeGreaterThanOrEqual(threshold);
    });

    it.each(["--card", "--muted", "--secondary"])("%s is a dark-mode surface", (surfaceVar) => {
      // A surface that stayed white would make the "light-only colours" bug
      // visible even with every text pair passing.
      if (theme === "dark") {
        expect(parseInt(vars[surfaceVar].slice(1, 3), 16)).toBeLessThan(0x40);
      }
    });
  });

  it("paints the modal only with theme-aware token utilities", () => {
    const { container } = render(<WalletModal />);
    const classes = classesIn(container);

    // The bug class-for-class: opaque palette utilities do not flip with `.dark`.
    const hardcoded = classes.filter((cls) =>
      /^(bg|text|border|ring)-(white|black|gray|slate|zinc|neutral|stone|amber|orange|yellow|rose|red|green|emerald|blue|indigo|violet|purple)-\d*$/.test(
        cls
      )
    );
    // The scrim is deliberately black in both themes; it is not a surface colour.
    expect(hardcoded.filter((cls) => cls !== "bg-black")).toEqual([]);

    const panel = screen.getByRole("heading", { name: /connect wallet/i }).closest("div")
      ?.parentElement;
    expect(panel).toHaveClass("bg-card");
    expect(panel).toHaveClass("border-border");
    expect(classes).toContain("text-card-foreground");
    expect(classes).toContain("text-muted-foreground");
  });

  it("styles the provider rows and their chips with semantic surfaces", () => {
    const { container } = render(<WalletModal />);
    const freighter = screen.getByRole("button", { name: /freighter wallet/i });

    expect(freighter).toHaveClass("bg-card", "border-border", "text-card-foreground");
    expect(freighter.className).toContain("hover:bg-muted");
    expect(container.querySelector('[class*="bg-secondary"]')).toHaveClass(
      "text-secondary-foreground"
    );
  });

  it.each([
    ["not_installed", "warn"],
    ["cancelled", "down"],
    ["network_mismatch", "warn"],
    ["generic", "down"],
  ] as const)("renders the %s alert on the %s status tokens", (type, tone) => {
    setConnectError({
      type,
      message: "Freighter rejected the request",
      expectedNetwork: "Testnet",
      freighterNetwork: "Mainnet",
    });

    render(<WalletModal />);

    const alert = screen.getByRole("button", { name: /freighter updated/i }).closest("div")
      ?.parentElement;
    expect(alert).not.toBeNull();
    expect(alert).toHaveClass(`bg-status-${tone}-bg`);
    expect(alert).toHaveClass(`text-status-${tone}`);
    expect(alert).toHaveClass(`border-status-${tone}-border`);
  });

  it("keeps the alert action buttons on an audited token pair in both states", () => {
    setConnectError({ type: "not_installed", message: "" });
    render(<WalletModal />);

    const getFreighter = screen.getByRole("link", { name: /get freighter/i });
    expect(getFreighter).toHaveClass("bg-status-warn", "text-status-warn-bg");
    // Hover swaps fill and text, and contrastRatio() is symmetric, so the same
    // audited pair backs the hovered state too.
    expect(getFreighter.className).toContain("hover:bg-status-warn-bg");
    expect(getFreighter.className).toContain("hover:text-status-warn");

    const retry = screen.getByRole("button", { name: /freighter updated/i });
    expect(retry).toHaveClass("bg-card", "text-status-warn", "border-status-warn-border");
  });

  it("warns about a missing WalletConnect project id on the warn token", () => {
    jest.mocked(isWalletConnectConfigured).mockReturnValue(false);

    render(<WalletModal />);

    expect(screen.getByRole("status")).toHaveClass("text-status-warn");
  });
});
