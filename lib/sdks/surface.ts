/**
 * The documented SDK surface: every `client.<resource>.<action>()` call the
 * SDK snippets are allowed to make, bound to the endpoint in
 * `lib/docs/endpoints.ts` that backs it.
 *
 * `lib/docs/__tests__/sdkSnippets.test.ts` fails when a snippet in any
 * language calls something that is not listed here, and when a listed call
 * points at an endpoint that no longer exists. `lib/sdks/sdk.d.ts` types the
 * same surface for the TypeScript snippet type-check.
 */
export const SDK_SURFACE: Record<string, Record<string, string>> = {
  payments: {
    create: 'payments-create',
    list: 'payments-list',
    get: 'payments-get',
    update: 'payments-update',
  },
  settlements: {
    create: 'settlements-create',
    list: 'settlements-list',
    get: 'settlements-get',
  },
  fx: {
    quote: 'fx-quote',
    rates: 'fx-rates',
  },
};

export function isDocumentedSdkCall(resource: string, action: string): boolean {
  return Boolean(SDK_SURFACE[resource]?.[action]);
}
