# ADR 001: State management with Zustand

## Status

Accepted

## Context

BettaPay's frontend needs to share a handful of cross-cutting pieces of client
state across otherwise unrelated parts of the React tree:

- Authentication state (current user, role, session token).
- Stellar wallet connection state (address, network, balances, connection
  errors).
- Network/offline status.
- API rate-limit windows (countdowns surfaced to the user).

These are small, mostly independent slices. They do **not** justify a heavy
global store with reducers, action creators, and middleware ceremony. The team
considered:

- **Redux Toolkit** — mature and well understood, but introduces boilerplate
  (slices, dispatch, selectors, provider wiring) that is disproportionate to the
  amount of state we hold. It also adds bundle weight.
- **React Context + `useReducer`** — no extra dependency, but context triggers
  re-renders of every consumer on any change, and stitching together several
  independent contexts becomes its own kind of boilerplate.
- **Zustand** — a minimal hook-based store with no provider requirement,
  selector-based subscriptions (components re-render only on the slices they
  read), and first-class middleware (`persist`) for the one place we need
  durability.

Server/cache state (anchor rates, table data, queries) is handled separately by
TanStack React Query, so the global store only needs to hold genuine **client**
state.

## Decision

Use **Zustand** as the single client-side state-management library. Each
concern lives in its own store under [`lib/store/`](../../lib/store):

- `authStore.ts` — user, role, and token. Wrapped in the `persist` middleware
  with `partialize` so that **only the non-sensitive `role`** survives a reload;
  the token and user object are kept in memory only.
- `walletStore.ts` — wallet address, network, balances, and connection errors.
- `offlineStore.ts` — online/offline status.
- `rateLimitStore.ts` — rate-limit countdown state.

Redux is explicitly **not** used. (Redux appears only as a transitive dependency
of other packages in the lockfile; nothing in `lib/` or `components/` imports
it.)

## Consequences

**Positive**

- Minimal boilerplate: a store is a single `create()` call returning state and
  the functions that mutate it — no actions, reducers, or dispatch.
- No provider wrapping required; any component can import the hook directly.
- Selector subscriptions keep re-renders narrow, which matters for the
  wallet/balance UI that updates frequently.
- The `persist` middleware gives us durable, security-conscious storage exactly
  where we need it (role only) without a separate persistence layer.
- Smaller bundle footprint than Redux Toolkit.

**Negative / trade-offs**

- Less prescriptive than Redux: there is no enforced action/reducer convention,
  so consistency across stores depends on team discipline.
- No built-in time-travel debugging or the Redux DevTools ecosystem (Zustand has
  a devtools middleware, but it is not enabled here by default).
- State logic is colocated with mutators rather than centralised, which some
  contributors coming from Redux may find unfamiliar.

## Related

- [ADR 004: Mock authentication](004-mock-auth.md) — `authStore` is the consumer
  of the mock auth flow.
