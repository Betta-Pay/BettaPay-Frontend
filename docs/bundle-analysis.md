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

| Route | Before | After | Δ |
| --- | ---: | ---: | ---: |
| `/` | 598 kB | _TBD_ | |
| `/about` | 459 kB | _TBD_ | |
| `/pricing` | 414 kB | _TBD_ | |
| `/status` | 433 kB | _TBD_ | |
| `/contact` | 443 kB | _TBD_ | |
| `/fiat-settlements` | 421 kB | _TBD_ | |
| `/sdks` | 412 kB | _TBD_ | |
| `/privacy` | 411 kB | _TBD_ | |
| `/terms` | 411 kB | _TBD_ | |
| `/guides` | 400 kB | _TBD_ | |
| `/docs` | 405 kB | _TBD_ | |
| shared baseline | 92.3 kB | _TBD_ | |

App routes (`/dashboard`, `/pay/[linkId]`, …) are unchanged.
