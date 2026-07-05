# <img src="./docs_logo.png" width="30" /> BettaPay Frontend (Next.js)

**Live Deployment:** [https://betta-pay-frontend.vercel.app/](https://betta-pay-frontend.vercel.app/)

BettaPay frontend — a Next.js 14 TypeScript app built as part of a Turborepo workspace. This package implements the merchant-facing UI for non-custodial payments (Stellar/Soroban integration) and is intended to be run as the frontend app inside a monorepo.

---

## Prerequisites

Before you start, make sure you have the following installed:

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | 18+ | LTS recommended |
| [pnpm](https://pnpm.io/installation) | 8+ | Used as the workspace package manager |
| [git](https://git-scm.com/) | any recent | For cloning and branch management |

Check your versions:

```bash
node -v   # should be v18.x or higher
pnpm -v   # should be 8.x or higher
git --version
```

Install pnpm if you don't have it:

```bash
npm install -g pnpm@8
```

---

## Monorepo structure

This repo is a **Turborepo** monorepo. The frontend lives alongside other packages (e.g. backend, shared types) under a single root. Here's where this package fits:

```
/                          ← monorepo root (pnpm-workspace.yaml here)
├── packages/
│   └── bettapay-frontend/ ← this package (Next.js app)
├── apps/                  ← other apps if present
├── turbo.json             ← Turborepo pipeline config
└── package.json           ← root workspace manifest
```

When you run commands from the **monorepo root**, use `--filter bettapay-frontend` to target this package. When working directly inside `packages/bettapay-frontend`, you can use `npm run <script>` or `pnpm run <script>` directly.

---

## Included in this package

- Next.js 14 app (`app/`)
- React 18, TypeScript
- Components in `components/`
- Lib helpers in `lib/`
- API routes (`app/api`)

---

## Quick start (workspace)

**1. Clone the repo and install dependencies from the monorepo root:**

```bash
git clone <repo-url>
cd <monorepo-root>
pnpm install
```

**2. Copy the environment file:**

```bash
cp packages/bettapay-frontend/.env.example packages/bettapay-frontend/.env.local
# then fill in values — see Environment variables section below
```

**3. Start the dev server:**

```bash
# from monorepo root
pnpm --filter bettapay-frontend dev

# or from inside the package directory
cd packages/bettapay-frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Running with the backend vs. mock mode

### With the backend running (full flow)

Set `NEXT_PUBLIC_API_URL` to point at your local backend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Then start the backend first, then this frontend. Auth flows (cookie setting, session refresh) will work end-to-end.

### Without the backend (mock mode)

If the backend is not available, the app falls back to a **mock flow**:

- Login will appear to succeed but **no HttpOnly auth cookies** will be set.
- API calls that require auth will return mock/empty data.
- Useful for UI development and component work without a running backend.

To explicitly signal mock mode, you can leave `NEXT_PUBLIC_API_URL` unset or point it at a non-responsive URL. No extra flag is needed — the app detects backend availability automatically.

---

## Environment variables

Create a `.env.local` in the frontend package root (or set in your deployment platform):

| Variable | Required | Default | Description | Example |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Backend API base URL. When unset or unreachable, the app falls back to **mock mode** — login appears to succeed, but no HttpOnly auth cookies are set and API calls return mock/empty data. Useful for UI development without a running backend. | `https://api.bettapay.com` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | `testnet` | Stellar network to connect to. Valid values: `testnet` (development/friendbot funding) or `mainnet` (production/live assets). Also accepts `public` as an alias for `mainnet`. Must match the network your Freighter wallet is configured for. | `mainnet` |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | No | `https://horizon-testnet.stellar.org` | Horizon RPC endpoint for querying Stellar ledger data. Defaults to the testnet Horizon instance. Set to `https://horizon.stellar.org` for mainnet, or a custom Horizon URL if running a private Stellar network or using a load-balanced endpoint. | `https://horizon.stellar.org` |
| `NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID` | No | Embedded demo default | Soroban smart contract ID for settlement logic. If not set, the app uses a hardcoded demo contract ID (`CBGBGKJSUY7XYB6HWW4CVAU6MW2KD25FSF45E5KCP53TKUK374MBZNFB`). In production, deploy your own contract and set this to its ID. | `CA3D...XYZ` |

> **Security:** never put secrets or private keys in `NEXT_PUBLIC_*` variables — they are exposed to the browser.

### Environment file precedence (Next.js + Vercel)

Next.js loads environment variables from `.env` files in this order (later files override earlier ones):

1. `.env.development` — used only when running `next dev`
2. `.env.production` — used only when running `next start` or during build
3. `.env.local` — **overrides all others** and is **never committed to git**

For local development, create a `.env.local` file. The values there will take precedence over any other `.env` files.

When deploying to **Vercel**, set environment variables in the **Vercel Dashboard** (Project Settings → Environment Variables) rather than relying on `.env.production` files in the repo. Vercel does not read `.env.local` from the repository during deployment — you must configure production/ preview/development variables in the Vercel UI or CLI.

---

## Development workflow

A typical dev loop looks like this:

```bash
# 1. Start the dev server (hot reload enabled)
pnpm dev

# 2. Lint — catch style and type issues early
pnpm lint
# or from monorepo root:
pnpm --filter bettapay-frontend lint

# 3. Build — verify a production build compiles cleanly
pnpm build
# or from monorepo root:
pnpm --filter bettapay-frontend build

# 4. Run tests
pnpm test
# or from monorepo root:
pnpm --filter bettapay-frontend test
```

**Before opening a PR**, run the full cycle to make sure nothing is broken:

```bash
pnpm lint && pnpm build && pnpm test
```

---

## Security & auth

- Frontend uses cookie-based auth. The server sets `HttpOnly`, `Secure`, `SameSite` cookies for auth tokens.
- Avoid storing tokens in `localStorage`. This repo keeps minimal client state in memory.
- Implement CSRF protection (double submit cookie or same-site cookie + anti-CSRF tokens) on state-changing endpoints.

---

## UI & accessibility

- Improved global typography and responsive container
- Better keyboard focus states and accessible labels on search fields and interactive controls
- Sidebar and topbar improved for semantics and ARIA

---

## Troubleshooting

### Backend not available / mock mode

**Symptom:** Login appears to work but you're immediately redirected back, or API calls return empty data.

**Fix:** Make sure the backend is running and `NEXT_PUBLIC_API_URL` points to it. If you want to intentionally develop without a backend, that's mock mode — see the section above. Check the browser console for network errors pointing to `localhost:3001` (or your configured URL).

---

### Freighter wallet not detected

**Symptom:** "Freighter not installed" error or wallet connection button does nothing.

**Fix:**
1. Install the [Freighter browser extension](https://www.freighter.app/).
2. Refresh the page after installing — extensions require a page reload to be detected.
3. Make sure Freighter is set to the same network as `NEXT_PUBLIC_STELLAR_NETWORK` (testnet vs mainnet).
4. If still not detected, check that the extension is enabled for the site in your browser's extension settings.

---

### Port 3000 already in use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`

**Fix — option 1:** Kill whatever is using port 3000:

```bash
# find the process
lsof -i :3000
# kill it (replace <PID> with the actual PID)
kill -9 <PID>
```

**Fix — option 2:** Run the dev server on a different port:

```bash
pnpm dev -- -p 3001
# or set in package.json scripts: "dev": "next dev -p 3001"
```

---

### Stellar / Horizon network errors

**Symptom:** Transactions fail or Horizon API calls return 5xx / connection refused.

**Fix:**
- Confirm `NEXT_PUBLIC_STELLAR_HORIZON_URL` is correct for your network.
  - Testnet: `https://horizon-testnet.stellar.org`
  - Mainnet: `https://horizon.stellar.org`
- Check [Stellar status](https://status.stellar.org/) for any network incidents.
- Testnet accounts need to be funded — use the [Stellar Friendbot](https://friendbot.stellar.org/) for testnet funding.

---

### Missing or stale `.env.local`

**Symptom:** App starts but features silently fail or use wrong network/contract.

**Fix:** Make sure `.env.local` exists and has all required variables set. After changing `.env.local`, restart the dev server — Next.js does not hot-reload env changes.

---

## Contributing

- This package is part of a monorepo — when creating PRs, scope changes to this package and update workspace build/test workflows as needed.
- Dependabot is configured to open weekly updates for npm dependencies in this package.

## Design system notes

- Uses Tailwind CSS with design tokens in `app/globals.css`
- Components live under `components/ui`; prefer reuse and accessibility-conscious patterns

## Component Library

This project keeps reusable UI, shared, and layout components in the `components` directory. These components help keep the frontend consistent, maintainable, and easy to extend.

### UI Components

| Component | Location | Purpose |
|---|---|---|
| Button | `components/ui/button.tsx` | Reusable button component for actions, forms, and navigation triggers. |
| Input | `components/ui/input.tsx` | Reusable form input component for text fields and form controls. |
| Card | `components/ui/card.tsx` | Container component used to group related content. |
| Badge | `components/ui/badge.tsx` | Small label component used for status, tags, and highlights. |
| Dialog | `components/ui/dialog.tsx` | Modal/dialog component used for confirmations, forms, and focused user actions. |

### Shared Components

| Component | Location | Purpose |
|---|---|---|
| StatusBadge | `components/StatusBadge.tsx` | Displays payment, account, or transaction status in a consistent format. |
| CurrencyDisplay | `components/CurrencyDisplay.tsx` | Formats and displays currency values consistently across the app. |
| CopyAddress | `components/CopyAddress.tsx` | Shows an address or text value with copy-to-clipboard support. |

### Layout Components

| Component | Location | Purpose |
|---|---|---|
| MerchantSidebar | `components/MerchantSidebar.tsx` | Sidebar navigation for merchant-facing pages. |
| AdminSidebar | `components/AdminSidebar.tsx` | Sidebar navigation for admin-facing pages. |
| Topbar | `components/Topbar.tsx` | Top navigation/header area used across dashboard pages. |
| Header | `components/Header.tsx` | Page or app header component. |
| Footer | `components/Footer.tsx` | Footer section used for common page layout. |

### Usage Example

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";

export function ExampleComponent() {
  return (
    <Card>
      <CardContent>
        <StatusBadge status="active" />
        <Button>Continue</Button>
      </CardContent>
    </Card>
  );
}
```

### Component Guidelines

- Reuse existing components before creating new ones.
- Keep component props simple and clearly named.
- Follow the existing `@base-ui/react` primitives and `shadcn` conventions used in the project.
- Keep layout components separate from low-level UI components.
- Prefer accessible and keyboard-friendly UI patterns.


## Next steps

- Implement proper server-side auth and refresh token endpoints
- Add CSRF protection and backend validation
- Run SCA (e.g., Snyk/Dependabot alerts) and resolve high severity issues

## License

Specify your license here.
