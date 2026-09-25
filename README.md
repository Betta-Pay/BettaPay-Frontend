# BettaPay Frontend (Next.js)

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
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | *(unset)* | Google OAuth 2.0 Web Client ID. Create in Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application), add your origin to **Authorized JavaScript origins**. When unset, empty or whitespace, the app does **not** mount `GoogleOAuthProvider` — no SDK errors are logged. The login page shows a disabled “Continue with Google” button with tooltip `“Google login not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID”` and a dev-only `console.warn`. Set this to enable Google sign-in. | `1234567890-abc.apps.googleusercontent.com` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | `testnet` | Stellar network to connect to. Valid values: `testnet` (development/friendbot funding) or `mainnet` (production/live assets). Also accepts `public` as an alias for `mainnet`. Must match the network your Freighter wallet is configured for. | `mainnet` |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | No | `https://horizon-testnet.stellar.org` | Horizon RPC endpoint for querying Stellar ledger data. Defaults to the testnet Horizon instance. Set to `https://horizon.stellar.org` for mainnet, or a custom Horizon URL if running a private Stellar network or using a load-balanced endpoint. | `https://horizon.stellar.org` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | For contract calls | *(unset)* | Soroban RPC endpoint used to simulate and submit smart-contract transactions (required by `/pay/[linkId]`, which throws when unset). Point it at `http://localhost:8000/rpc` to use a local node — see [Local Soroban node (offline development)](#local-soroban-node-offline-development). | `http://localhost:8000/rpc` |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | For contract calls | *(unset)* | Network passphrase used when building transactions; required alongside `NEXT_PUBLIC_SOROBAN_RPC_URL` (the pay flow throws when it is empty). Use `Test SDF Network ; September 2015` for testnet or `Standalone Network ; February 2017` for a local node. | `Standalone Network ; February 2017` |
| `NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID` | No | Embedded demo default | Soroban smart contract ID for settlement logic. If not set, the app uses a hardcoded demo contract ID (`CBGBGKJSUY7XYB6HWW4CVAU6MW2KD25FSF45E5KCP53TKUK374MBZNFB`). In production, deploy your own contract and set this to its ID. | `CA3D...XYZ` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Only for WalletConnect | *(unset)* | WalletConnect Cloud project ID, required to pair mobile wallets (Lobstr, Solar, …) over the WalletConnect relay. Get one for free at [cloud.walletconnect.com](https://cloud.walletconnect.com) → **Create project** → copy the **Project ID** (a 32-character hex string), and add your site origin to the project's allowed domains. When unset, empty or whitespace, WalletConnect is treated as **not configured**: no relay connection is attempted, the connect modal shows a “WalletConnect is not configured” notice instead of a QR code, and a dev-only `console.warn` is logged. Freighter keeps working. | `9f3c2e1a4b5d6c7e8f9a0b1c2d3e4f5a` |
| `NEXT_PUBLIC_WALLETCONNECT_RELAY_URL` | No | `wss://relay.walletconnect.com` | WalletConnect v2 relay WebSocket URL. Only change this if you run your own relay. | `wss://relay.walletconnect.com` |

> **Security:** never put secrets or private keys in `NEXT_PUBLIC_*` variables — they are exposed to the browser.

### Environment file precedence (Next.js + Vercel)

Next.js loads environment variables from `.env` files in this order (later files override earlier ones):

1. `.env.development` — used only when running `next dev`
2. `.env.production` — used only when running `next start` or during build
3. `.env.local` — **overrides all others** and is **never committed to git**

For local development, create a `.env.local` file. The values there will take precedence over any other `.env` files.

When deploying to **Vercel**, set environment variables in the **Vercel Dashboard** (Project Settings → Environment Variables) rather than relying on `.env.production` files in the repo. Vercel does not read `.env.local` from the repository during deployment — you must configure production/ preview/development variables in the Vercel UI or CLI.

---

## Local Soroban node (offline development)

To exercise smart-contract interactions without touching Testnet, run a standalone Stellar/Soroban node locally and point the app at it. Once the Docker image has been pulled, the node + backend + this frontend run entirely offline.

**Additional prerequisites for this section:** [Docker](https://docs.docker.com/get-docker/) 20.10+, and optionally the [Stellar CLI](https://developers.stellar.org/docs/tools/cli/stellar-cli) (`brew install stellar-cli` or `cargo install stellar-cli`).

### 1. Start the node

**Option A — Stellar CLI** (recommended):

```bash
# downloads the stellar/quickstart image and starts it in local mode
stellar container start local
```

**Option B — Docker directly:**

```bash
docker run -d -p "8000:8000" --name stellar stellar/quickstart --local
```

`--local` starts an accelerated private network (ledgers close roughly once a second). Everything is proxied through port 8000:

| Service | URL |
|---|---|
| Horizon | `http://localhost:8000/` |
| Soroban RPC | `http://localhost:8000/rpc` |
| Friendbot (faucet) | `http://localhost:8000/friendbot` |
| Stellar Lab | `http://localhost:8000/lab` |
| Network passphrase | `Standalone Network ; February 2017` |

The first start pulls a large image and then initialises the services — this can take a couple of minutes. Watch the logs (`stellar container logs` for Option A, `docker logs -f stellar` for Option B) until you see `stellar-rpc: up and ready`, then verify the RPC:

```bash
curl -s http://localhost:8000/rpc -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
# → {"jsonrpc":"2.0","id":1,"result":{"status":"healthy"}}
```

Stop the node with `stellar container stop` (Option A) or `docker stop stellar` (Option B). The container is ephemeral — state is discarded on restart unless you mount a volume (`-v /absolute/path:/opt/stellar`).

### 2. Point the frontend at localhost

Append the following to `.env.local`, then **restart `pnpm dev`** (Next.js does not hot-reload env changes):

```bash
# Horizon + Soroban RPC served by the local node
NEXT_PUBLIC_STELLAR_HORIZON_URL=http://localhost:8000
NEXT_PUBLIC_SOROBAN_RPC_URL=http://localhost:8000/rpc

# Passphrase of the standalone network — required when building transactions
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Standalone Network ; February 2017

# Contract + merchant account on the local node (step 3)
NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID=<contract id printed on deploy>
NEXT_PUBLIC_MERCHANT_ADDRESS=<G... address of your local key>

# Backend stays local as well (see "Running with the backend vs. mock mode")
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Things worth knowing:

- **Leave `NEXT_PUBLIC_STELLAR_NETWORK=testnet`.** It is validated to `testnet | mainnet | public` (`lib/config.ts`) and the app refuses to boot on any other value. It does not switch endpoints — `NEXT_PUBLIC_STELLAR_HORIZON_URL` and `NEXT_PUBLIC_SOROBAN_RPC_URL` do that.
- The Content-Security-Policy in `next.config.js` builds `connect-src` from those two URL variables, so `http://localhost:8000` is allowed automatically — no CSP edits needed.
- Use `http://localhost:8000/rpc` for the RPC. The older `/soroban/rpc` path is deprecated in current Quickstart images.

### 3. Fund an account and deploy a contract

Run these from your contract repository:

```bash
stellar keys generate alice --network local --fund

stellar contract deploy \
  --wasm target/wasm32v1-none/release/my_contract.wasm \
  --source-account alice \
  --network local
# (on older toolchains the wasm lands in target/wasm32-unknown-unknown/release/;
#  inside a Cargo workspace, `stellar contract deploy --source-account alice --network local` builds it for you)
```

Copy the printed contract ID into `NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID`, and the key's public address (`stellar keys address alice`) into `NEXT_PUBLIC_MERCHANT_ADDRESS`.

### 4. Run the stack

```bash
pnpm dev   # frontend → http://localhost:3000
```

Contract simulation and submission (`/pay/[linkId]`), health checks, and any other request built from `NEXT_PUBLIC_STELLAR_HORIZON_URL` / `NEXT_PUBLIC_SOROBAN_RPC_URL` now target `localhost:8000`. Friendbot on the local node funds accounts, so nothing needs to reach the public internet.

### Known limitations

- **Freighter signing.** `lib/stellar/freighter.ts` derives the passphrase it passes to Freighter from `NEXT_PUBLIC_STELLAR_NETWORK` (Testnet/Mainnet only), so a wallet-signed transaction built with the standalone passphrase is rejected by the local node. Until that helper honours `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`, sign local transactions with the Stellar CLI or [Stellar Lab](http://localhost:8000/lab) instead of the in-app wallet flow.
- **Transaction history & explorer links.** `lib/hooks/useTransactionHistory.ts` and `lib/utils/explorer.ts` resolve their endpoints from `NEXT_PUBLIC_STELLAR_NETWORK`, so those panels still call the public testnet Horizon / stellar.expert and need internet access (they show no data for local accounts).

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
1. Install the [Freighter browser extension](http://web.archive.org/web/20260602205949/https://freighter.app/).
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

### Local Soroban node not reachable

**Symptom:** Contract calls fail with a network error, or `/pay/[linkId]` throws `NEXT_PUBLIC_SOROBAN_RPC_URL is not set` / `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE is not set`.

**Fix:**
1. Confirm a `stellar/quickstart` container is running (`docker ps`), then `curl -s http://localhost:8000/rpc -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`.
2. Wait for the first boot to finish — it can take a minute or two; the container logs (`stellar container logs` or `docker logs <container>`) should end with `stellar-rpc: up and ready`.
3. Make sure `.env.local` sets `NEXT_PUBLIC_SOROBAN_RPC_URL=http://localhost:8000/rpc` and `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Standalone Network ; February 2017`, then restart `pnpm dev`.

See [Local Soroban node (offline development)](#local-soroban-node-offline-development) for the full setup.

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
