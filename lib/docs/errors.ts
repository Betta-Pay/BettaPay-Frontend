// Canonical error catalog. Every code the gateway can return in the
// `{ error: { code, message, details? } }` envelope, with its HTTP status,
// common causes and how to resolve it. Kept beside the endpoint metadata so the
// Error Reference and the per-endpoint error tables stay consistent.

export interface ErrorCodeEntry {
  code: string;
  status: number;
  meaning: string;
  causes: string[];
  resolution: string;
}

export const errorCatalog: ErrorCodeEntry[] = [
  {
    code: 'VALIDATION_ERROR',
    status: 400,
    meaning: 'The request body or query failed schema validation.',
    causes: [
      'A required field is missing or null.',
      'A field has the wrong type (e.g. a string where a number is expected).',
      'A value is out of range — a non-positive amount, or a string past its max length.',
      'An enum field received a value outside the allowed set.',
    ],
    resolution:
      'Read error.details — it lists the offending path and reason per field. Fix the payload and retry; retrying unchanged will always fail.',
  },
  {
    code: 'UNAUTHORIZED',
    status: 401,
    meaning: 'The request carried no valid identity.',
    causes: [
      'The Authorization header is missing or is not in the form "Bearer <jwt>".',
      'The JWT has expired (exp is in the past).',
      'The JWT signature does not verify against the gateway secret.',
      'For auth routes: a Google ID token or wallet signature failed verification.',
    ],
    resolution:
      'Refresh the token and replay the request once. If the refresh also fails, clear the session and re-authenticate.',
  },
  {
    code: 'FORBIDDEN',
    status: 403,
    meaning: 'You are authenticated, but not allowed to perform this action.',
    causes: [
      'Reading or mutating a merchant, payment or settlement you do not own.',
      'A settlement amount below the merchant minimum or above the maximum.',
      'A settlement that would exceed the daily limit.',
    ],
    resolution:
      'Check the merchantId claim in your JWT matches the resource, and that settlement amounts sit inside your configured limits.',
  },
  {
    code: 'NOT_FOUND',
    status: 404,
    meaning: 'No such resource is visible to you.',
    causes: [
      'The id does not exist.',
      'The resource belongs to another merchant, so it is hidden rather than disclosed.',
      'The path is misspelled.',
    ],
    resolution: 'Verify the id and the route. Treat 404 as terminal — do not retry.',
  },
  {
    code: 'REQUEST_TIMEOUT',
    status: 408,
    meaning: 'The request exceeded the gateway request timeout (30s).',
    causes: [
      'An unusually large payload or a slow client connection.',
      'The gateway was saturated and could not finish in time.',
    ],
    resolution: 'Retry with exponential backoff. Shrink the payload or page the request if it is large.',
  },
  {
    code: 'IDEMPOTENCY_CONFLICT',
    status: 409,
    meaning: 'The request conflicts with existing state.',
    causes: [
      'An Idempotency-Key was reused with a different request body.',
      'An illegal payment status transition (for example completed → pending).',
    ],
    resolution:
      'Use a fresh Idempotency-Key for a genuinely new request, and reuse the exact original body when retrying. For transitions, re-read the resource and move only forward.',
  },
  {
    code: 'RATE_LIMITED',
    status: 429,
    meaning: 'You exceeded the rate limit for this route.',
    causes: [
      'More than 1000 requests/minute globally from one IP.',
      'More than 100 requests/minute against auth endpoints.',
      'More than 30 requests/minute against state-changing routes.',
    ],
    resolution:
      'Honour the Retry-After response header, then retry with exponential backoff and jitter. Cache reads instead of polling tightly.',
  },
  {
    code: 'GATEWAY_TIMEOUT',
    status: 504,
    meaning: 'An upstream service did not respond in time.',
    causes: [
      'The FX engine was slow or unavailable when pricing rates or quotes.',
      'The settlement engine was unreachable while queueing a settlement.',
    ],
    resolution:
      'Retry with backoff. This is transient — the request may or may not have been applied, so pair it with an Idempotency-Key where supported.',
  },
];

export interface StatusEntry {
  status: number;
  name: string;
  meaning: string;
}

export const httpStatuses: StatusEntry[] = [
  { status: 200, name: 'OK', meaning: 'The request succeeded; the payload is in `data`.' },
  { status: 201, name: 'Created', meaning: 'A resource was created; the new resource is in `data`.' },
  { status: 400, name: 'Bad Request', meaning: 'Schema validation failed — see `VALIDATION_ERROR`.' },
  { status: 401, name: 'Unauthorized', meaning: 'Missing, malformed or expired credentials.' },
  { status: 403, name: 'Forbidden', meaning: 'Authenticated but not permitted, or a limit was exceeded.' },
  { status: 404, name: 'Not Found', meaning: 'No such resource is visible to the caller.' },
  { status: 408, name: 'Request Timeout', meaning: 'The 30s gateway request timeout elapsed.' },
  { status: 409, name: 'Conflict', meaning: 'Idempotency conflict or an illegal state transition.' },
  { status: 429, name: 'Too Many Requests', meaning: 'Rate limit exceeded; check `Retry-After`.' },
  { status: 500, name: 'Internal Server Error', meaning: 'Unexpected server fault. Safe to retry with backoff.' },
  { status: 504, name: 'Gateway Timeout', meaning: 'An upstream engine did not respond in time.' },
];
