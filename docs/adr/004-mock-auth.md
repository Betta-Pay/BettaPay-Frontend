# ADR 004: Mock authentication for preview deployments

## Status

Accepted

## Context

The BettaPay frontend is developed and demoed ahead of (and independently from)
a production authentication backend. Two needs collide:

1. **Preview deployments.** Every branch/PR is deployed to a **Vercel preview**
   so reviewers and stakeholders can click through real UI. These previews have
   **no guaranteed backend** to authenticate against.
2. **Local development & demos.** Contributors need to log in and exercise
   role-gated flows (merchant vs. admin) without standing up auth infrastructure.

A hard dependency on a real auth server would make previews unusable whenever the
backend is absent, broken, or not yet built — defeating the purpose of
per-PR previews. At the same time, we did not want two divergent code paths that
rot independently; the mock should sit behind the same store and routing the real
flow will eventually use.

## Decision

Ship a **mock authentication** flow that works entirely client-side, with a
graceful fallback when a backend is unreachable.

Implemented in [`app/auth/login/page.tsx`](../../app/auth/login):

- **Email login.** Any email is accepted. An email containing `"admin"` is
  granted `role: 'admin'`; anything else is treated as a `merchant`.
- **Wallet login.** A connected Freighter public key becomes the user id, with a
  derived display email of the form `{first6}...{last4}@freighter.app`.
- **Token.** A hardcoded `mock_jwt_token_12345` stands in for a real JWT and is
  intentionally kept **in memory only** (not written to `localStorage`).
- **Backend-optional.** The page *attempts* to fetch merchant data from
  `/api/merchants/{merchantId}` and to POST a session to `/api/auth/session`,
  but **silently falls back to mock data** if those calls fail — explicitly
  noted in code as "falling back to mock auth for Vercel preview". A default
  merchant Stellar address is used when none is returned.

Supporting pieces:

- `useAuthStore` (Zustand, see [ADR 001](001-state-management.md)) holds the
  in-memory user (`id`, `email`, `name`, `role`); only `role` is persisted.
- `useSessionCheck()` attempts session recovery via `GET /api/auth/session`
  (e.g. after a tab restore).
- [`middleware.ts`](../../middleware.ts) performs role-based routing based on
  `auth_token` / `user_role` cookies.

## Consequences

**Positive**

- Vercel previews and local demos work with **zero backend dependency** — every
  PR is immediately clickable.
- Both `merchant` and `admin` role paths are exercisable without provisioning
  users.
- The mock lives behind the same `authStore` and middleware the real flow will
  use, so swapping in real auth is a matter of replacing the login
  implementation, not rewiring consumers.
- Keeping the token in memory (and persisting only the role) avoids teaching the
  codebase insecure token-storage habits that would carry into production.

**Negative / trade-offs**

- **Not secure** and must never be enabled in production: any email logs in, and
  the admin role is granted by a substring match. This is a deliberate
  preview/dev affordance, not an auth system.
- The silent backend fallback can mask a genuinely broken backend during
  development (a failed real call looks the same as "no backend").
- There is an implicit contract between the mock and the eventual real API
  shapes (`/api/merchants/...`, `/api/auth/session`) that must be kept in sync.

> ⚠️ **Production note:** before any production launch this mock must be replaced
> with real authentication, and the substring-based admin escalation removed.

## Related

- [ADR 001: State management with Zustand](001-state-management.md) — `authStore`
  holds the resulting session state.
- [ADR 003: Payment infrastructure on Stellar + Soroban](003-payment-infra.md) —
  wallet login reuses the Freighter integration.
