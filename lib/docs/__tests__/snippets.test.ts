import { codeSnippets, OPERATION_ENDPOINTS, type Language, type Operation } from '@/components/developers/codeSnippets';
import { allEndpoints } from '@/lib/docs/endpoints';
import { DOCS_BASE_URL } from '@/lib/docs/navigation';
import { generateSamples } from '@/lib/docs/snippets';
import {
  buildRouteRegistry,
  extractRequest,
  extractSdkCall,
  extractSdkFields,
  validateGeneratedSample,
  validateRequestExample,
  routesForPath,
  validateSdkOperation,
  validateSnippetWithTypeScript,
  type SdkBindingDescriptor,
  type SnippetProblem,
} from '@/lib/docs/snippet-validation';
import type { Endpoint, SampleLanguage } from '@/lib/docs/types';

/**
 * Docs snippet validation.
 *
 * Both snippet sources are checked against `lib/docs/endpoints.ts`, which is
 * the registry of what the gateway actually exposes. A snippet that points at
 * an unregistered route, uses the wrong verb, ships a body that is not valid
 * JSON, or names a field the schema does not document fails this suite — and
 * with it, CI.
 */

const registry = buildRouteRegistry(allEndpoints);
const SAMPLE_LANGUAGES: SampleLanguage[] = [
  'curl',
  'node-fetch',
  'node-axios',
  'python',
  'react',
];

function describeProblems(problems: SnippetProblem[]): string {
  return problems.map((p) => `  [${p.kind}] ${p.source}: ${p.message}`).join('\n');
}

describe('endpoint registry', () => {
  it('has unique endpoint ids', () => {
    const ids = allEndpoints.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('registers at most one endpoint per method + path', () => {
    const seen = new Set<string>();
    for (const endpoint of allEndpoints) {
      const key = `${endpoint.method} ${endpoint.path}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it.each(allEndpoints.map((e) => [e.id, e] as const))(
    '%s: requestExample only uses documented fields',
    (_id, endpoint) => {
      const problems = validateRequestExample(endpoint);
      expect(describeProblems(problems)).toBe('');
    },
  );
});

describe('generated request examples (lib/docs/snippets.ts)', () => {
  const cases = allEndpoints.flatMap((endpoint) =>
    generateSamples(endpoint, SAMPLE_LANGUAGES).map(
      (sample) => [`${endpoint.id} / ${sample.language}`, endpoint, sample] as const,
    ),
  );

  it.each(cases)('%s matches the endpoint registry', (_name, endpoint, sample) => {
    const problems = validateGeneratedSample(endpoint, sample, registry);
    expect(describeProblems(problems)).toBe('');
  });

  it.each(cases)('%s is non-empty and references the documented base URL', (_n, _e, sample) => {
    expect(sample.code.trim().length).toBeGreaterThan(0);
    expect(sample.code).toContain(DOCS_BASE_URL);
  });

  it('emits a parseable JSON body for every endpoint that documents one', () => {
    for (const endpoint of allEndpoints) {
      if (!endpoint.requestExample) continue;
      if (!['POST', 'PATCH', 'PUT'].includes(endpoint.method)) continue;

      const [curl] = generateSamples(endpoint, ['curl']);
      const { rawBody } = extractRequest(curl.code, 'curl');

      expect(rawBody).not.toBeNull();
      expect(JSON.parse(rawBody as string)).toEqual(endpoint.requestExample);
    }
  });

  it('does not emit a request body on GET or DELETE samples', () => {
    for (const endpoint of allEndpoints) {
      if (endpoint.method !== 'GET' && endpoint.method !== 'DELETE') continue;

      const [curl] = generateSamples(endpoint, ['curl']);
      expect(extractRequest(curl.code, 'curl').rawBody).toBeNull();
    }
  });
});

describe('SDK snippets (components/developers/codeSnippets.ts)', () => {
  const operations = Object.keys(codeSnippets) as Operation[];

  it('maps every operation onto a registered endpoint', () => {
    for (const operation of operations) {
      const mapping = OPERATION_ENDPOINTS[operation];
      expect(mapping).toBeDefined();
      expect(allEndpoints.some((e) => e.id === mapping.endpointId)).toBe(true);
    }
  });

  // The generated samples in snippets.ts are derived from the registry, so they
  // cannot contradict it. This binding can: it restates the verb and path
  // independently, which is what makes a route rename in endpoints.ts fail here
  // instead of silently republishing stale examples.
  it.each(operations)('%s is bound to a route that still exists', (operation) => {
    const { endpointId, method, path } = OPERATION_ENDPOINTS[operation];
    const endpoint = allEndpoints.find((e) => e.id === endpointId);

    expect(endpoint).toBeDefined();
    expect(`${method} ${path}`).toBe(`${(endpoint as Endpoint).method} ${(endpoint as Endpoint).path}`);

    // And the route must be reachable through the registry as a whole.
    const matches = routesForPath(registry, path).filter((r) => r.method === method);
    expect(matches).toHaveLength(1);
  });

  it.each(operations)('%s agrees across languages and with the schema', (operation) => {
    const { endpointId, call } = OPERATION_ENDPOINTS[operation];
    const endpoint = allEndpoints.find((e) => e.id === endpointId) as Endpoint;

    const problems = validateSdkOperation(
      operation,
      endpoint,
      call,
      codeSnippets[operation] as Record<Language, string>,
    );
    expect(describeProblems(problems)).toBe('');
  });
});

// ─── The checks themselves ───────────────────────────────────────────────────
//
// A validator that cannot fail is not a gate. These cases feed deliberately
// broken snippets through the same code path the suites above use.

describe('the validator rejects broken snippets', () => {
  const realEndpoint = allEndpoints.find((e) => e.id === 'payments-create') as Endpoint;

  it('flags a sample pointing at a route that is not in the registry', () => {
    const bogus: Endpoint = { ...realEndpoint, id: 'bogus', path: '/api/not-a-route' };
    const [sample] = generateSamples(bogus, ['curl']);

    const problems = validateGeneratedSample(bogus, sample, registry);
    expect(problems.map((p) => p.kind)).toContain('unknown-route');
    expect(problems[0].message).toContain('/api/not-a-route');
  });

  it('flags a sample using a verb the route does not accept', () => {
    // DELETE /api/payments is not registered; the path is.
    const wrongVerb: Endpoint = { ...realEndpoint, id: 'wrong-verb', method: 'DELETE' };
    const [sample] = generateSamples(wrongVerb, ['curl']);

    const problems = validateGeneratedSample(wrongVerb, sample, registry);
    expect(problems.map((p) => p.kind)).toContain('method-mismatch');
  });

  it('flags a request example carrying an undocumented field', () => {
    const drifted: Endpoint = {
      ...realEndpoint,
      id: 'drifted',
      requestExample: { amountUsdc: 25, notAField: true },
    };

    const problems = validateRequestExample(drifted);
    expect(problems.map((p) => p.kind)).toContain('unknown-field');
  });

  it('flags a request example that omits a required field', () => {
    const missing: Endpoint = {
      ...realEndpoint,
      id: 'missing',
      requestExample: { currency: 'USDC' },
    };

    const problems = validateRequestExample(missing);
    expect(problems.map((p) => p.kind)).toContain('missing-required-field');
  });

  it('flags SDK snippets whose languages disagree about the fields', () => {
    const { endpointId, call } = OPERATION_ENDPOINTS['initiate-settlement'];
    const endpoint = allEndpoints.find((e) => e.id === endpointId) as Endpoint;
    const snippets = { ...codeSnippets['initiate-settlement'] } as Record<Language, string>;

    // Drop `destination` from the Python tab only.
    snippets.python = snippets.python.replace(/,\n\s*destination='bank_acct_123'/, '');

    const problems = validateSdkOperation('initiate-settlement', endpoint, call, snippets);
    expect(problems.map((p) => p.kind)).toContain('field-drift');
  });

  it('flags an operation bound to a route the registry no longer has', () => {
    // Simulates renaming a route in endpoints.ts without revisiting the
    // snippets: the binding still names the path the registry has dropped.
    const renamed = allEndpoints.map((e) =>
      e.id === 'payments-create' ? { ...e, path: '/api/paymentz' } : e,
    );
    const staleRegistry = buildRouteRegistry(renamed);
    const binding = OPERATION_ENDPOINTS['create-payment-link'];

    expect(
      routesForPath(staleRegistry, binding.path).filter((r) => r.method === binding.method),
    ).toHaveLength(0);

    // And the binding no longer agrees with its endpoint.
    const endpoint = renamed.find((e) => e.id === binding.endpointId) as Endpoint;
    expect(endpoint.path).not.toBe(binding.path);
  });

  it('flags an SDK snippet calling the wrong resource', () => {
    const { endpointId, call } = OPERATION_ENDPOINTS['initiate-settlement'];
    const endpoint = allEndpoints.find((e) => e.id === endpointId) as Endpoint;
    const snippets = { ...codeSnippets['initiate-settlement'] } as Record<Language, string>;

    snippets.javascript = snippets.javascript.replace(
      'client.settlements.create(',
      'client.payouts.create(',
    );

    const problems = validateSdkOperation('initiate-settlement', endpoint, call, snippets);
    expect(problems.map((p) => p.kind)).toContain('unknown-route');
  });
});

describe('extraction helpers', () => {
  it('reads the verb out of each generated language', () => {
    const endpoint = allEndpoints.find((e) => e.id === 'payments-create') as Endpoint;
    for (const sample of generateSamples(endpoint, SAMPLE_LANGUAGES)) {
      expect(extractRequest(sample.code, sample.language).method).toBe('POST');
    }
  });

  it('resolves a concrete URL back to its templated route', () => {
    const endpoint = allEndpoints.find((e) => e.id === 'payments-get') as Endpoint;
    const [curl] = generateSamples(endpoint, ['curl']);
    const { pathname } = extractRequest(curl.code, 'curl');

    expect(pathname).not.toBeNull();
    expect(pathname).not.toBe('/api/payments/:id');
    expect(registry.some((r) => r.matcher.test(pathname as string))).toBe(true);
  });

  it('normalizes SDK call spelling across languages', () => {
    const snippets = codeSnippets['initiate-settlement'];
    for (const language of Object.keys(snippets) as Language[]) {
      expect(extractSdkCall(snippets[language])).toEqual({
        resource: 'settlements',
        action: 'create',
      });
    }
  });

  it('extracts the same field set from all four SDK languages', () => {
    const snippets = codeSnippets['create-payment-link'];
    const expected = ['amountUsdc', 'currency', 'source'].sort();

    for (const language of Object.keys(snippets) as Language[]) {
      expect(Array.from(extractSdkFields(snippets[language], language)).sort()).toEqual(expected);
    }
  });
});

describe('TypeScript compiler snippet validation (#942)', () => {
  const sdkBindings: SdkBindingDescriptor[] = (Object.keys(OPERATION_ENDPOINTS) as Operation[]).map(
    (operation) => {
      const { endpointId, call } = OPERATION_ENDPOINTS[operation];
      const endpoint = allEndpoints.find((e) => e.id === endpointId) as Endpoint;
      return { endpoint, call };
    },
  );

  it.each(Object.keys(codeSnippets) as Operation[])(
    'compiles SDK JavaScript snippet for %s without TypeScript errors',
    (operation) => {
      const code = codeSnippets[operation].javascript;
      const problems = validateSnippetWithTypeScript(
        `${operation}/javascript`,
        code,
        sdkBindings,
      );
      expect(describeProblems(problems)).toBe('');
    },
  );

  it('compiles generated node-fetch, node-axios, and react samples without TypeScript errors', () => {
    const tsLanguages: SampleLanguage[] = ['node-fetch', 'node-axios', 'react'];
    for (const endpoint of allEndpoints) {
      for (const sample of generateSamples(endpoint, tsLanguages)) {
        const problems = validateSnippetWithTypeScript(
          `${endpoint.id}/${sample.language}`,
          sample.code,
          sdkBindings,
        );
        expect(describeProblems(problems)).toBe('');
      }
    }
  });

  it('rejects a snippet with a mismatched field type or unknown SDK property', () => {
    const brokenTypeSnippet = codeSnippets['create-payment-link'].javascript.replace(
      'amountUsdc: 25.0',
      "amountUsdc: 'twenty-five'",
    );
    const problems = validateSnippetWithTypeScript(
      'create-payment-link/javascript',
      brokenTypeSnippet,
      sdkBindings,
    );
    expect(problems.map((p) => p.kind)).toContain('type-error');
  });
});
