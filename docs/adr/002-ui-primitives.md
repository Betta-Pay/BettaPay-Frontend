# ADR 002: UI primitives with @base-ui/react

## Status

Accepted

## Context

BettaPay needs accessible, unstyled UI primitives (buttons, dialogs, selects,
popovers, menus, avatars, inputs, etc.) that we can style with Tailwind to match
the brand. The de-facto pattern in the React/Tailwind ecosystem is **shadcn/ui**:
copy-in component source built on a headless primitive library, styled with
`class-variance-authority` (CVA) and a `cn()` class-merging helper.

Historically shadcn/ui has been built on **Radix UI**. The team evaluated using
Radix directly versus **@base-ui/react** — the successor primitive library from
the same authors as Radix and the maintainers of Floating UI — which:

- Provides the same headless, accessibility-first primitives (focus management,
  ARIA wiring, keyboard interaction, portalling/positioning).
- Is the direction the shadcn ecosystem is moving toward, so staying compatible
  keeps the door open to shadcn tooling and conventions.
- Exposes useful composition helpers such as `merge-props` and `useRender` for
  building polymorphic components.

We did not want to hand-roll accessibility (focus traps, roving tabindex, ARIA
roles) ourselves, and we did not want a fully styled component kit (e.g. MUI)
that would fight Tailwind and the custom gold theme.

## Decision

Use **@base-ui/react** as the headless primitive layer, wrapped in
shadcn-style components under [`components/ui/`](../../components/ui). Each
component:

- Imports the relevant `@base-ui/react/*` primitive (e.g.
  `@base-ui/react/dialog`, `@base-ui/react/select`, `@base-ui/react/menu`).
- Applies styling with **CVA** variant definitions and **Tailwind** utility
  classes that reference our semantic CSS-variable tokens (`background`,
  `foreground`, `primary`, …).
- Merges incoming `className` via the `cn()` helper so callers can override.

Examples in the codebase include `button`, `select` (with `Positioner`/`Popup`),
`dialog` (with `Backdrop`/`Portal`), `popover`, `menu`, `avatar`, `input`,
`badge` (using `merge-props` + `useRender`), and `separator`.

Components are authored manually (wrapping the primitives) rather than generated
through the shadcn CLI scaffolding, giving us full control over the wrapper API.

## Consequences

**Positive**

- Accessibility (focus management, ARIA, keyboard nav, positioning) comes from a
  maintained, battle-tested library instead of bespoke code.
- shadcn-compatible structure (CVA + Tailwind + `cn()`) means the codebase looks
  familiar to most React developers and can adopt shadcn patterns over time.
- Styling is fully owned by us via Tailwind + CSS variables, so theming
  (see [ADR 005](005-theming.md)) flows straight through to every primitive.
- Aligns with the forward direction of the shadcn ecosystem rather than the
  legacy Radix base.

**Negative / trade-offs**

- @base-ui/react is newer than Radix; its API surface is still stabilising, so
  upgrades may require occasional component-wrapper adjustments.
- Fewer third-party copy-paste examples target @base-ui directly compared to the
  large existing corpus of Radix-based shadcn components, so some wrappers must
  be written by hand.
- Manual authoring (no CLI scaffolding) means new primitives are a small amount
  of upfront work versus running a generator.

## Related

- [ADR 005: Theming with next-themes and CSS variables](005-theming.md) — the
  CSS-variable tokens these components consume.
