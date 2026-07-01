# API Integration Guide

This document describes how the BettaPay frontend talks to the backend API, what endpoints the current UI expects, and how to test API-dependent flows locally or in preview deployments.

## API client configuration

The shared Axios client lives in [`lib/api/axios.ts`](../lib/api/axios.ts):

```ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
```

Key behavior:

- `NEXT_PUBLIC_API_URL` controls the backend base URL.
- If the variable is unset, the frontend defaults to `http://localhost:3001`.
- `withCredentials: true` is enabled so browser requests include backend-set cookies.
- JSON is the default request/response format.
- State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) attach the CSRF header from the CSRF cookie when available.
- A separate refresh client posts to `/api/auth/refresh` after a `401` response, then retries the original request.
- A `429` response updates the rate-limit store and shows an accessible toast/announcement.

## Authentication model

The frontend is designed around cookie-based authentication:

- The backend should set auth/session tokens in `HttpOnly` cookies.
- The client-side Zustand auth store may hold an in-memory token for the active tab, but it must not persist the token to `localStorage`.
- The auth store persists only the non-sensitive `role` field.
- Logout calls `DELETE /api/auth/session` so the backend can clear the auth cookie.

See also:

- [`docs/adr/001-state-management.md`](adr/001-state-management.md)
- [`docs/adr/004-mock-auth.md`](adr/004-mock-auth.md)

## CSRF and CORS requirements

For local development and hosted environments, the backend must allow the frontend origin and credentials.

Backend CORS should allow:

- The local frontend origin, usually `http://localhost:3000`.
- Vercel preview/production origins used by the project.
- Credentialed requests (`Access-Control-Allow-Credentials: true`).
- JSON request headers.
- The CSRF header name used by [`lib/utils/csrf.ts`](../lib/utils/csrf.ts).

For state-changing endpoints, the backend should validate the CSRF token using the same double-submit cookie pattern expected by the frontend.

## Expected endpoints

### `POST /api/auth/session`

Sets an authentication cookie for the browser session.

Used by:

- Email login in [`app/auth/login/page.tsx`](../app/auth/login/page.tsx)
- Wallet login in [`app/auth/login/page.tsx`](../app/auth/login/page.tsx)

Request body:

```json
{
  "token": "mock_jwt_token_12345",
  "role": "merchant"
}
```

Expected response:

```json
{
  "ok": true
}
```

Backend responsibilities:

- Validate the token or session payload in real deployments.
- Set an `HttpOnly`, `Secure` where appropriate, `SameSite` auth cookie.
- Return a non-2xx status for invalid session data.

### `GET /api/auth/session`

Restores a session when the in-memory auth store was lost but a persisted role exists.

Used by:

- [`lib/hooks/useSessionCheck.ts`](../lib/hooks/useSessionCheck.ts)

Expected successful response:

```json
{
  "user": {
    "id": "merchant-id",
    "email": "merchant@example.com",
    "name": "Merchant User",
    "role": "merchant"
  },
  "token": "session-token"
}
```

If the backend returns `200` without `user` and `token`, the hook treats the cookie-backed session as valid and leaves client state alone.

Expected expired/invalid response:

```json
{
  "error": "Session expired"
}
```

Use a `401` or `403` status for expired/invalid sessions so the frontend clears auth state and redirects to login.

### `DELETE /api/auth/session`

Clears the auth cookie during logout.

Used by:

- [`lib/store/authStore.ts`](../lib/store/authStore.ts)

Expected response:

```json
{
  "ok": true
}
```

Backend responsibilities:

- Clear the same cookie name used by `POST /api/auth/session`.
- Keep the endpoint idempotent; repeated logout requests should still succeed.

### `POST /api/auth/refresh`

Refreshes a cookie-backed session after an API request receives `401`.

Used by:

- The Axios response interceptor in [`lib/api/axios.ts`](../lib/api/axios.ts)

Expected response:

```json
{
  "ok": true
}
```

When this call succeeds, the frontend retries the original request. When it fails, the frontend logs the user out and redirects to `/auth/login`.

### `GET /api/merchants/:id`

Fetches merchant profile data for the login flow.

Used by:

- Email login in [`app/auth/login/page.tsx`](../app/auth/login/page.tsx)

Expected successful response:

```json
{
  "id": "GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD",
  "name": "Merchant User"
}
```

If the backend is unavailable or returns an error-like response, the login page falls back to mock merchant data for local/preview usability.

### `POST /api/merchants`

Registers a merchant record.

Used by:

- [`app/auth/register/page.tsx`](../app/auth/register/page.tsx)

Request body currently sent by the frontend:

```json
{
  "id": "merch_generatedid",
  "name": "Acme Corp"
}
```

Expected response:

```json
{
  "id": "merch_generatedid",
  "name": "Acme Corp"
}
```

If this call fails in preview/local mock mode, the registration page shows a successful mock registration after a short delay.

### `POST /api/payments`

Creates or submits a payment for a payment link.

Used by:

- [`app/pay/[linkId]/page.tsx`](../app/pay/%5BlinkId%5D/page.tsx)

The exact request shape should stay aligned with the payment form fields and backend payment contract. At minimum, the backend should return a payment identifier or transaction metadata that the UI can display after submission.

### `GET /api/payments/:txId`

Fetches payment status by transaction id.

Used by:

- [`app/pay/status/[txId]/page.tsx`](../app/pay/status/%5BtxId%5D/page.tsx)

Expected response should include the payment/transaction status, amount, asset, and any display metadata needed by the status page.

## Local backend development

Run the backend on port `3001` or set the frontend to the backend URL:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Then start the frontend:

```bash
npm run dev
```

The frontend runs at `http://localhost:3000` by default. The backend must allow that origin with credentials.

## Vercel preview and mock mode

Preview deployments may not have a live backend. The auth flow deliberately falls back to mock behavior so reviewers can navigate the UI:

- Login accepts any email.
- Emails containing `admin` receive the `admin` role; others receive `merchant`.
- The mock token is kept in memory only.
- The app attempts to set the session cookie, but continues when `/api/auth/session` is unavailable.
- Merchant fetch and registration calls fall back to mock data when the backend is unavailable.

This behavior is for development and previews only. It is not a production authentication system.

## Testing endpoints with curl

Replace `http://localhost:3001` with your backend URL.

Set auth cookie:

```bash
curl -i -X POST http://localhost:3001/api/auth/session \
  -H 'Content-Type: application/json' \
  --data '{"token":"mock_jwt_token_12345","role":"merchant"}'
```

Check session:

```bash
curl -i http://localhost:3001/api/auth/session \
  --cookie 'auth_token=example'
```

Clear session:

```bash
curl -i -X DELETE http://localhost:3001/api/auth/session \
  --cookie 'auth_token=example'
```

Fetch merchant:

```bash
curl -i http://localhost:3001/api/merchants/GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD
```

Create merchant:

```bash
curl -i -X POST http://localhost:3001/api/merchants \
  -H 'Content-Type: application/json' \
  --data '{"id":"merch_demo","name":"Demo Merchant"}'
```

## Troubleshooting

- **Cookies are not sent:** confirm `withCredentials: true`, backend CORS `Access-Control-Allow-Credentials: true`, and a matching allowed origin.
- **CSRF failures:** confirm the CSRF cookie exists and the backend expects the same CSRF header name as the frontend.
- **Login works in preview but not locally:** verify `NEXT_PUBLIC_API_URL` points to a running backend and that CORS allows `http://localhost:3000`.
- **User is redirected after reload:** the persisted role exists, but `GET /api/auth/session` may be returning a non-2xx response; inspect the network tab and backend logs.
