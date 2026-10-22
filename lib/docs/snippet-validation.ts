import type { CodeSample } from './snippets';
import { DOCS_BASE_URL } from './navigation';
import type { Endpoint, HttpMethod, SampleLanguage } from './types';

// Validation for the request examples shown in the docs.
//
// Both snippet sources — the generated samples in `snippets.ts` and the
// hand-written SDK examples in `components/developers/codeSnippets.ts` — used
// to be unchecked prose. Nothing stopped an example from pointing at a route
// that does not exist, using a verb the route does not accept, or naming a
// field the schema dropped three refactors ago.
//
// Everything here is pure and dependency-free so it can run in a unit test;
// `lib/docs/__tests__/snippets.test.ts` is what turns it into a CI gate.

export interface SnippetProblem {
  /** Which snippet the problem was found in. */
  source: string;
  kind:
    | 'unknown-route'
    | 'method-mismatch'
    | 'missing-url'
    | 'missing-method'
    | 'malformed-body'
    | 'body-mismatch'
    | 'unknown-field'
    | 'missing-required-field'
    | 'field-drift';
  message: string;
}

// ─── Route registry ──────────────────────────────────────────────────────────

export interface RegisteredRoute {
  endpointId: string;
  method: HttpMethod;
  /** Template path, e.g. `/api/payments/:id`. */
  path: string;
  matcher: RegExp;
}

/** Turn `/api/payments/:id` into `^/api/payments/[^/]+$`. */
function toMatcher(path: string): RegExp {
  const escaped = path
    .split('/')
    .map((segment) =>
      segment.startsWith(':')
        ? '[^/]+'
        : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('/');
  return new RegExp(`^${escaped}$`);
}

export function buildRouteRegistry(endpoints: Endpoint[]): RegisteredRoute[] {
  return endpoints.map((endpoint) => ({
    endpointId: endpoint.id,
    method: endpoint.method,
    path: endpoint.path,
    matcher: toMatcher(endpoint.path),
  }));
}

/** All routes registered at a pathname, regardless of verb. */
export function routesForPath(registry: RegisteredRoute[], pathname: string): RegisteredRoute[] {
  return registry.filter((route) => route.matcher.test(pathname));
}

// ─── Request extraction ──────────────────────────────────────────────────────

export interface ExtractedRequest {
  url: string | null;
  pathname: string | null;
  method: HttpMethod | null;
  /** Raw JSON request body, when the snippet carries one. */
  rawBody: string | null;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

function toMethod(raw: string | undefined): HttpMethod | null {
  if (!raw) return null;
  const upper = raw.toUpperCase() as HttpMethod;
  return METHODS.includes(upper) ? upper : null;
}

/**
 * Pull the request line out of a generated sample.
 *
 * Every generator embeds the absolute URL verbatim, so the URL is found the
 * same way in all five languages; only the verb is expressed differently.
 */
export function extractRequest(code: string, language: SampleLanguage): ExtractedRequest {
  const urlMatch = code.match(
    new RegExp(`${DOCS_BASE_URL.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[^"'\\s\`]*`),
  );
  const url = urlMatch ? urlMatch[0] : null;

  let pathname: string | null = null;
  if (url) {
    try {
      pathname = new URL(url).pathname;
    } catch {
      pathname = null;
    }
  }

  let method: HttpMethod | null = null;
  switch (language) {
    case 'curl':
      method = toMethod(code.match(/curl\s+-X\s+([A-Z]+)/)?.[1]);
      break;
    case 'node-axios':
      method = toMethod(code.match(/axios\.([a-z]+)\s*\(/)?.[1]);
      break;
    case 'python':
      method = toMethod(code.match(/requests\.([a-z]+)\s*\(/)?.[1]);
      break;
    case 'node-fetch':
    case 'react':
      method = toMethod(code.match(/method:\s*'([A-Za-z]+)'/)?.[1]);
      break;
  }

  // axios/requests express GET by calling `.get(...)`, and the fetch samples
  // always spell the verb out, so a missing match is a real omission.
  const bodyMatch = code.match(/-d\s+'([\s\S]*)'\s*$/);

  return { url, pathname, method, rawBody: bodyMatch ? bodyMatch[1] : null };
}

// ─── Generated-sample validation ─────────────────────────────────────────────

/**
 * Check one generated sample against the endpoint it claims to document and
 * against the route registry as a whole.
 */
export function validateGeneratedSample(
  endpoint: Endpoint,
  sample: CodeSample,
  registry: RegisteredRoute[],
): SnippetProblem[] {
  const problems: SnippetProblem[] = [];
  const source = `${endpoint.id}/${sample.language}`;
  const request = extractRequest(sample.code, sample.language);

  if (!request.url || !request.pathname) {
    problems.push({
      source,
      kind: 'missing-url',
      message: `Sample does not contain a ${DOCS_BASE_URL} request URL.`,
    });
    return problems;
  }

  const matches = routesForPath(registry, request.pathname);
  if (matches.length === 0) {
    problems.push({
      source,
      kind: 'unknown-route',
      message: `"${request.pathname}" is not a route in the endpoint registry.`,
    });
    return problems;
  }

  if (!request.method) {
    problems.push({
      source,
      kind: 'missing-method',
      message: 'Sample does not state an HTTP method.',
    });
  } else if (!matches.some((route) => route.method === request.method)) {
    const allowed = matches.map((route) => route.method).join(', ');
    problems.push({
      source,
      kind: 'method-mismatch',
      message: `${request.method} ${request.pathname} is not registered (registry allows: ${allowed}).`,
    });
  } else if (request.method !== endpoint.method) {
    problems.push({
      source,
      kind: 'method-mismatch',
      message: `Sample uses ${request.method} but "${endpoint.id}" is ${endpoint.method}.`,
    });
  }

  if (request.rawBody !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(request.rawBody);
    } catch {
      problems.push({
        source,
        kind: 'malformed-body',
        message: 'Request body in the sample is not valid JSON.',
      });
      return problems;
    }

    if (JSON.stringify(parsed) !== JSON.stringify(endpoint.requestExample)) {
      problems.push({
        source,
        kind: 'body-mismatch',
        message: "Sample body does not match the endpoint's requestExample.",
      });
    }
  }

  return problems;
}

// ─── Schema conformance ──────────────────────────────────────────────────────

/** Field names an endpoint documents for the given kind of parameter. */
export function documentedFields(endpoint: Endpoint): {
  all: Set<string>;
  required: Set<string>;
} {
  const fields = endpoint.method === 'GET' ? endpoint.queryParams : endpoint.requestBody;
  return {
    all: new Set((fields ?? []).map((field) => field.name)),
    required: new Set((fields ?? []).filter((f) => f.required).map((f) => f.name)),
  };
}

/**
 * Check a set of field names used by a snippet against an endpoint's schema:
 * nothing undocumented, and nothing required left out.
 */
export function validateFields(
  source: string,
  endpoint: Endpoint,
  used: Set<string>,
): SnippetProblem[] {
  const problems: SnippetProblem[] = [];
  const { all, required } = documentedFields(endpoint);

  for (const field of used) {
    if (!all.has(field)) {
      problems.push({
        source,
        kind: 'unknown-field',
        message: `"${field}" is not documented on "${endpoint.id}".`,
      });
    }
  }

  for (const field of required) {
    if (!used.has(field)) {
      problems.push({
        source,
        kind: 'missing-required-field',
        message: `Required field "${field}" is missing from the snippet.`,
      });
    }
  }

  return problems;
}

/** `requestExample` must itself agree with the documented request schema. */
export function validateRequestExample(endpoint: Endpoint): SnippetProblem[] {
  if (!endpoint.requestExample) return [];
  return validateFields(
    `${endpoint.id}/requestExample`,
    endpoint,
    new Set(Object.keys(endpoint.requestExample)),
  );
}

// ─── Hand-written SDK snippets ───────────────────────────────────────────────
//
// `components/developers/codeSnippets.ts` shows the same operation in four
// languages. Two things drift there: the languages drift apart from each
// other, and all four drift away from the API schema. Both are checkable.

export type SdkLanguage = 'javascript' | 'python' | 'php' | 'go' | 'rust';

export interface SdkCall {
  /** Resource segment, normalized (e.g. `payments`). */
  resource: string;
  /** Action segment, normalized (e.g. `create`). */
  action: string;
}

/** Strip case and separators so `payment_links`, `PaymentLinks` and
 * `paymentLinks` compare equal. */
function normalizeSegment(segment: string): string {
  return segment.replace(/[_-]/g, '').toLowerCase();
}

/** Find the SDK call in a snippet, in whichever way the language spells it. */
export function extractSdkCall(code: string): SdkCall | null {
  // `client.payments.create(`, `client.Payments.Create(`, `$client->payments->create(`,
  // `client.fx().quote(` (Rust accessor)
  const match = code.match(SDK_CALL);
  if (!match) return null;
  return { resource: normalizeSegment(match[1]), action: normalizeSegment(match[2]) };
}

const SDK_CALL = /\$?client\s*(?:\.|->)\s*(\w+)\s*(?:\(\))?\s*(?:\.|->)\s*(\w+)\s*\(/;

/** Every SDK call in a snippet, not just the first. */
export function extractAllSdkCalls(code: string): SdkCall[] {
  const calls: SdkCall[] = [];
  for (const m of code.matchAll(new RegExp(SDK_CALL.source, 'g'))) {
    calls.push({ resource: normalizeSegment(m[1]), action: normalizeSegment(m[2]) });
  }
  return calls;
}

/** Calls a snippet makes that are not part of the documented SDK surface. */
export function validateSdkSurface(
  source: string,
  code: string,
  isDocumented: (resource: string, action: string) => boolean,
): SnippetProblem[] {
  const calls = extractAllSdkCalls(code);
  if (calls.length === 0) {
    return [{ source, kind: 'unknown-route', message: 'Snippet does not contain a recognizable SDK call.' }];
  }
  return calls
    .filter((call) => !isDocumented(call.resource, call.action))
    .map((call) => ({
      source,
      kind: 'unknown-route' as const,
      message: `${call.resource}.${call.action} is not part of the documented SDK surface.`,
    }));
}

/** Return the source between an opening delimiter and its balanced partner. */
function balancedSlice(code: string, openIndex: number, open: string, close: string): string {
  let depth = 0;
  for (let i = openIndex; i < code.length; i += 1) {
    if (code[i] === open) depth += 1;
    else if (code[i] === close) {
      depth -= 1;
      if (depth === 0) return code.slice(openIndex + 1, i);
    }
  }
  return '';
}

/** The argument list of the SDK call, so trailing output comments are ignored. */
function sdkCallArguments(code: string): string {
  const match = code.match(SDK_CALL);
  if (!match || match.index === undefined) return '';
  return balancedSlice(code, match.index + match[0].length - 1, '(', ')');
}

/**
 * Field names a snippet passes to the SDK call, normalized to the API's
 * camelCase vocabulary so the four languages are comparable.
 */
export function extractSdkFields(code: string, language: SdkLanguage): Set<string> {
  const args = sdkCallArguments(code);
  const fields = new Set<string>();

  const push = (name: string) => {
    if (name) fields.add(name);
  };

  switch (language) {
    case 'javascript':
      for (const m of args.matchAll(/(?:^|[{,])\s*(\w+)\s*:/g)) push(m[1]);
      break;
    case 'python':
      for (const m of args.matchAll(/(?:^|[(,])\s*(\w+)\s*=/g)) push(m[1]);
      // `from` is a Python keyword, so dict-style arguments are allowed too.
      for (const m of args.matchAll(/['"](\w+)['"]\s*:/g)) push(m[1]);
      break;
    case 'php':
      for (const m of args.matchAll(/'(\w+)'\s*=>/g)) push(m[1]);
      break;
    case 'go':
      // Go struct fields are exported, so `AmountUsdc` maps to `amountUsdc`.
      for (const m of args.matchAll(/(?:^|[{,])\s*([A-Z]\w*)\s*:/g)) {
        push(m[1].charAt(0).toLowerCase() + m[1].slice(1));
      }
      break;
    case 'rust':
      // Struct literal: `QuoteRequest { from: ..., to: ... }`
      for (const m of args.matchAll(/(?:^|[{,])\s*([a-z_]\w*)\s*:/g)) push(m[1]);
      break;
  }

  return fields;
}

/**
 * Cross-check the four language variants of one operation: identical field
 * sets, an SDK call that names the endpoint's resource and action, and fields
 * that the endpoint actually documents.
 */
export function validateSdkOperation(
  operation: string,
  endpoint: Endpoint,
  expectedCall: SdkCall,
  snippets: Partial<Record<SdkLanguage, string>>,
): SnippetProblem[] {
  const problems: SnippetProblem[] = [];
  const languages = Object.keys(snippets) as SdkLanguage[];

  const fieldsByLanguage = new Map<SdkLanguage, Set<string>>();

  for (const language of languages) {
    const source = `${operation}/${language}`;
    const code = snippets[language] ?? '';

    const call = extractSdkCall(code);
    if (!call) {
      problems.push({
        source,
        kind: 'unknown-route',
        message: 'Snippet does not contain a recognizable SDK call.',
      });
      continue;
    }

    if (call.resource !== expectedCall.resource || call.action !== expectedCall.action) {
      problems.push({
        source,
        kind: 'unknown-route',
        message:
          `Snippet calls ${call.resource}.${call.action} but "${operation}" maps to ` +
          `${expectedCall.resource}.${expectedCall.action} (${endpoint.method} ${endpoint.path}).`,
      });
    }

    const fields = extractSdkFields(code, language);
    fieldsByLanguage.set(language, fields);
    problems.push(...validateFields(source, endpoint, fields));
  }

  // Every language must show the same fields, otherwise the tabs disagree.
  const [reference, ...rest] = Array.from(fieldsByLanguage.entries());
  if (reference) {
    const expected = Array.from(reference[1]).sort().join(', ');
    for (const [language, fields] of rest) {
      const actual = Array.from(fields).sort().join(', ');
      if (actual !== expected) {
        problems.push({
          source: `${operation}/${language}`,
          kind: 'field-drift',
          message: `Fields [${actual}] differ from ${reference[0]} [${expected}].`,
        });
      }
    }
  }

  return problems;
}
