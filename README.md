# <img src="./docs_logo.png" width="30" /> BettaPay Frontend (Next.js)

**Live Deployment:** [https://betta-pay-frontend.vercel.app/](https://betta-pay-frontend.vercel.app/)

BettaPay frontend — a Next.js 14 TypeScript app built as part of a Turborepo workspace. This package implements the merchant-facing UI for non-custodial payments (Stellar/Soroban integration) and is intended to be run as the frontend app inside a monorepo.

## Included in this package
- Next.js 14 app (app/)
- React 18, TypeScript
- Components in components/
- Lib helpers in lib/
- API routes (app/api)

## Quick start (workspace)
From the monorepo root, run the workspace package manager used by the project (pnpm, npm or yarn). Examples:

Using pnpm (recommended for monorepos):

```bash
pnpm install
pnpm --filter bettapay-frontend dev
```

Using npm (single-package dev):

```bash
cd packages/frontend  # if this package is located in packages/frontend
npm ci
npm run dev
```

Open http://localhost:3000 to view the app.

## Environment variables
Create a .env.local in the frontend package (or set in your deployment) with these keys:

- NEXT_PUBLIC_API_URL - Backend API base URL (optional) - default: http://localhost:3001
- NEXT_PUBLIC_STELLAR_NETWORK - testnet|mainnet (default: testnet)
- NEXT_PUBLIC_STELLAR_HORIZON_URL - Horizon URL (default testnet)
- NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID - Soroban contract id for settlement (demo default provided)

Security: never store secrets in NEXT_PUBLIC_* keys. Keep private keys and sensitive server-side secrets in server environments only.

## Security & auth
- Frontend uses cookie-based auth. Server should set HttpOnly, Secure, SameSite cookies for auth tokens.
- Avoid storing tokens in localStorage. This repo migrates to server-set HttpOnly cookies and keeps minimal client state in memory.
- Implement CSRF protection (double submit cookie or same-site cookie + anti-CSRF tokens) on state-changing endpoints.

## UI & accessibility changes
This update includes:
- Improved global typography and responsive container
- Better keyboard focus states and accessible labels on search fields and interactive controls
- Sidebar and topbar improved for semantics and ARIA

## Running checks (locally)
From package root or monorepo root (target package):

```bash
# install deps
pnpm install
# lint
pnpm --filter bettapay-frontend lint
# build
pnpm --filter bettapay-frontend build
# audit
pnpm audit --json | jq .
```

If you use npm/yarn, adapt commands accordingly.

## Dev tips
- Run the frontend with the backend API available to exercise auth flows (cookie setting). If no backend, login falls back to a mock flow but will not set HttpOnly cookies.
- Use environment-specific cookie attributes in production (Secure; SameSite=None; domain).

## Contributing
- This package is part of a monorepo — when creating PRs, scope changes to this package and update workspace build/test workflows as needed.
- Dependabot is configured to open weekly updates for npm dependencies in this package.

## Design system notes
- Uses Tailwind CSS with design tokens in app/globals.css
- Components live under components/ui; prefer reuse and accessibility-conscious patterns

## Next steps
- Implement proper server-side auth and refresh token endpoints
- Add CSRF protection and backend validation
- Run SCA (e.g., Snyk/Dependabot alerts) and resolve high severity issues

## License
Specify your license here.
