# Marketing bundle analysis (issue #584)

## How to reproduce

```bash
npm run analyze     # ANALYZE=true next build — writes .next/analyze/*.html
# or just read the per-route "First Load JS" column from:
npm run build
```

`npm run analyze` opens three treemaps (`client.html`, `nodes.html`,
`edge.html`). The per-route **First Load JS** figures below come straight from
the `next build` summary table and are the number a visitor actually downloads
for that route.

## Problem

Every marketing route inherited the full authenticated-app runtime:

- the root layout wrapped **all** routes in `Providers` → `@tanstack/react-query`,
  the auth/offline zustand stores, session polling, RUM;
- `import { Header, Footer } from "@/components/layout"` pulled the barrel's
  `Topbar` / `Sidebar` / `MobileNav` siblings, which import the wallet store,
  `apiClient` (axios) and the notification center;
- `app/page.tsx` did `import * as LucideIcons from "lucide-react"`, defeating
  icon tree-shaking and pulling the whole icon set;
- `@/components/ui`'s barrel re-exported `OfflineBanner`, so importing a single
  primitive (`Button`) dragged React Query + the offline store into the page.

## Fix

1. `AppProviders` (React Query, session, cross-tab, RUM, offline banner) is
   split out of the root layout and mounted by `ConditionalAppProviders` only
   for non-marketing routes (`isMarketingRoute` in `lib/auth/session.ts`).
   `ThemeProvider` stays in the root layout so marketing keeps theming.
2. Marketing pages and the shared `Header` / `Footer` deep-import
   (`@/components/layout/Header`, `@/components/ui/button`) instead of the
   barrels.
3. `OfflineBanner` is removed from the `@/components/ui` barrel.
4. `app/page.tsx` imports the three icons it uses by name; `lib/landing.ts`
   carries the icon component directly.

## Results — First Load JS per route

Measured from the `next build` summary table, before vs. after this branch.

| Route | Before | After | Δ |
| --- | ---: | ---: | ---: |
| `/` | 598 kB | **153 kB** | −445 kB (−74%) |
| `/pricing` | 414 kB | **162 kB** | −252 kB |
| `/status` | 433 kB | **183 kB** | −250 kB |
| `/docs`, `/docs/[...slug]` | 405 kB | **156 kB** | −249 kB |
| `/privacy` | 411 kB | **151 kB** | −260 kB |
| `/terms` | 411 kB | **151 kB** | −260 kB |
| `/guides/*` | 400–403 kB | **237–239 kB** | ~−163 kB |
| `/about` | 459 kB | **286 kB** | −173 kB |
| `/contact` | 443 kB | **270 kB** | −173 kB |
| `/sdks` | 412 kB | **238 kB** | −174 kB |
| `/fiat-settlements` | 421 kB | **411 kB** | −10 kB (keeps AppProviders for its live anchor table; barrel only) |
| shared baseline | 92.3 kB | 92.3 kB | unchanged |

The landing chunk was inspected directly (`.next/app-build-manifest.json`
→ per-chunk grep): **0 chunks contain axios, 0 contain `@tanstack/react-query`,
0 contain wallet SDK code.** The only remaining "wallet" match is the bundled
i18n dictionary, which contains the string "Connect Freighter Wallet" as data.

### Side effects (app routes that also imported the barrels)

| Route | Before | After |
| --- | ---: | ---: |
| `/payments/[linkId]` | 403 kB | 253 kB |
| `/merchants/kyb` | 396 kB | 271 kB |
| `/wallet` | 396 kB | 246 kB |
| `/settings/team` | 361 kB | 212 kB |
| `/notifications` | 371 kB | 208 kB |
| `/auth/register`, `/auth/magic` | 369 kB | 207 kB |
| `/admin/performance` | 511 kB | 386 kB |

Core authenticated routes (`/dashboard`, `/pay/[linkId]`, `/payments`,
`/settlement`) are unchanged.

## Remaining opportunities (out of scope here)

- `/about` still ships ~195 kB over baseline — the Team/Investors/Timeline
  sections are candidates for `next/dynamic` islands.
- The i18n dictionaries are bundled in full for every locale; runtime locale
  splitting would trim the shared baseline.
