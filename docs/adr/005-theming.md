# ADR 005: Theming with next-themes and CSS variables

## Status

Accepted

## Context

BettaPay has a distinct brand (a gold accent on a light surface) and needs to
support a dark mode that respects the user's operating-system preference while
still allowing a manual override. Theming requirements:

- A single source of truth for semantic colors (background, foreground, primary,
  card, border, chart, sidebar, shadows) shared by every UI primitive.
- Light and dark variants of those tokens.
- Respect `prefers-color-scheme` by default, with the ability to toggle.
- No flash of the wrong theme on load, and no re-plumbing of every component when
  the palette changes.

Hardcoding colors per component, or threading a theme object through React
context/props, would couple every component to the palette and make adding dark
mode invasive. The Tailwind-native answer is **CSS custom properties** as the
token layer, combined with a class-based dark-mode strategy that a library can
manage without hydration flicker.

## Decision

Use **next-themes** to manage the active theme via a `class` strategy, with all
color tokens expressed as **CSS variables** that Tailwind maps to semantic
utilities.

- **Provider.** [`components/providers.tsx`](../../components/providers.tsx)
  wraps the app in `<ThemeProvider attribute="class" defaultTheme="system"
  enableSystem={true}>`. next-themes toggles a `.dark` class on `<html>` and
  handles system-preference detection without a theme flash.
- **Tokens.** [`app/globals.css`](../../app/globals.css) defines the palette as
  CSS variables on `:root` (light) and `.dark` (dark):
  - Light: primary `#F0A500` (gold), background `#FFFFFF`, foreground `#0F172A`,
    border `#E2E8F0`, white card/popover.
  - Dark: primary `#FBBF24` (amber), background `#0F172A`, foreground `#F8FAFC`,
    card `#1E293B`, border `#334155`.
  - Plus per-theme shadow tokens, chart colors, and sidebar variables.
- **Tailwind mapping.** [`tailwind.config.ts`](../../tailwind.config.ts) sets
  `darkMode: ["class"]` and extends `theme.colors` so semantic utilities resolve
  to the variables, e.g. `background: "var(--background)"`,
  `primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" }`.

Because the @base-ui/react component wrappers (see [ADR 002](002-ui-primitives.md))
style themselves with these semantic Tailwind tokens, switching the `.dark` class
re-themes the entire UI at runtime with no component changes.

## Consequences

**Positive**

- One source of truth: changing a CSS variable re-themes every component that
  uses the corresponding semantic token.
- Dark mode is **fully implemented** (complete light + dark palettes), defaults
  to the system preference, and supports a manual toggle via next-themes.
- Runtime theme switching is instant (CSS variables) with no flash of incorrect
  theme on load, which next-themes handles.
- Adding a new themed property is additive — define the variable in both blocks
  and map it once in Tailwind.

**Negative / trade-offs**

- Color values live in CSS rather than TypeScript, so they are not type-checked
  and must be kept in sync between the `:root` and `.dark` blocks by hand.
- Every new semantic token requires touching three places (globals.css light,
  globals.css dark, tailwind.config.ts).
- The class strategy depends on next-themes injecting the class early; bypassing
  the provider (e.g. rendering outside it) would lose theming.

## Related

- [ADR 002: UI primitives with @base-ui/react](002-ui-primitives.md) — the
  components that consume these tokens.
