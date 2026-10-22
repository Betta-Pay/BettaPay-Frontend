import fs from 'node:fs';
import path from 'node:path';
import { codeSnippets } from '@/components/developers/codeSnippets';
import { allEndpoints } from '@/lib/docs/endpoints';
import {
  extractSdkCall,
  extractSdkFields,
  validateFields,
  validateSdkSurface,
  type SdkLanguage,
} from '@/lib/docs/snippet-validation';
import { RUST_SAMPLE, SDK_SAMPLES, getAllDisplayedSnippets } from '@/lib/sdks/samples';
import { SDK_SURFACE, isDocumentedSdkCall } from '@/lib/sdks/surface';
import { PLAYGROUND_FROM, PLAYGROUND_TO } from '@/lib/playground/quote';

describe('SDK surface', () => {
  const entries = Object.entries(SDK_SURFACE).flatMap(([resource, actions]) =>
    Object.entries(actions).map(([action, endpointId]) => [`${resource}.${action}`, resource, action, endpointId] as const),
  );

  it.each(entries)('%s is backed by a registered endpoint', (_name, _resource, _action, endpointId) => {
    expect(allEndpoints.some((e) => e.id === endpointId)).toBe(true);
  });

  it.each(entries)('%s is declared in sdk.d.ts', (_name, resource, action) => {
    const dts = fs.readFileSync(path.join(process.cwd(), 'lib/sdks/sdk.d.ts'), 'utf8');
    const block = dts.match(new RegExp(`${resource}: \\{([\\s\\S]*?)\\n  \\};`));
    expect(block?.[1]).toMatch(new RegExp(`\\b${action}\\(`));
  });
});

describe('every displayed snippet calls a documented SDK method', () => {
  const quickstarts = SDK_SAMPLES.map((s) => ({ name: `${s.id}/quickstart`, code: s.quickstart }));
  const all = [
    ...getAllDisplayedSnippets().filter((s) => !s.name.endsWith('/install')),
    ...quickstarts,
  ];

  it.each(all.map((s) => [s.name, s.code] as const))('%s', (name, code) => {
    expect(validateSdkSurface(name, code, isDocumentedSdkCall)).toEqual([]);
  });

  it('flags a method the SDK does not have', () => {
    const problems = validateSdkSurface('bad', 'await client.payments.refund({ id: 1 });', isDocumentedSdkCall);
    expect(problems[0].message).toContain('payments.refund');
  });
});

describe('quote snippets', () => {
  const quote = allEndpoints.find((e) => e.id === 'fx-quote')!;

  it('uses the real gateway route', () => {
    expect(quote.path).toBe('/api/quote');
  });

  it.each([
    ['javascript', codeSnippets['get-fx-quote'].javascript],
    ['python', codeSnippets['get-fx-quote'].python],
    ['php', codeSnippets['get-fx-quote'].php],
    ['go', codeSnippets['get-fx-quote'].go],
    ['rust', RUST_SAMPLE],
  ] as Array<[SdkLanguage, string]>)('%s calls fx.quote with only documented fields', (language, code) => {
    expect(extractSdkCall(code)).toEqual({ resource: 'fx', action: 'quote' });
    expect(validateFields(`quote/${language}`, quote, extractSdkFields(code, language))).toEqual([]);
  });
});

describe('playground allow-lists', () => {
  it('only offers assets the app supports', () => {
    expect(PLAYGROUND_FROM).toEqual(expect.arrayContaining(['USDC', 'XLM']));
    expect(PLAYGROUND_TO).toEqual(expect.arrayContaining(['NGN', 'USD']));
  });
});
