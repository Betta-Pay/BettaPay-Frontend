import type { Endpoint, SampleLanguage } from './types';
import { DOCS_BASE_URL } from './navigation';

// Generates request examples in every supported language from a single Endpoint
// definition, so the five samples on an endpoint can never drift apart. Consumed
// by `components/docs/RequestExample.tsx`.

export interface CodeSample {
  language: SampleLanguage;
  label: string;
  /** Highlighting grammar/alias understood by Shiki. */
  grammar: string;
  code: string;
}

export const SAMPLE_LABELS: Record<SampleLanguage, string> = {
  curl: 'cURL',
  'node-fetch': 'Node.js (fetch)',
  'node-axios': 'Node.js (axios)',
  python: 'Python',
  react: 'React',
};

const SAMPLE_GRAMMARS: Record<SampleLanguage, string> = {
  curl: 'bash',
  'node-fetch': 'javascript',
  'node-axios': 'javascript',
  python: 'python',
  react: 'tsx',
};

/** Substitute `:param` placeholders in a path with their example values. */
function resolvePath(endpoint: Endpoint): string {
  let path = endpoint.path;
  for (const param of endpoint.pathParams ?? []) {
    path = path.replace(`:${param.name}`, param.example ?? `<${param.name}>`);
  }
  return path;
}

/** Build a query string from an endpoint's example query params. */
function resolveQuery(endpoint: Endpoint): string {
  const params = (endpoint.queryParams ?? []).filter((p) => p.required || p.example);
  if (params.length === 0) return '';
  const pairs = params.map((p) => `${p.name}=${encodeURIComponent(p.example ?? `<${p.name}>`)}`);
  return `?${pairs.join('&')}`;
}

function fullUrl(endpoint: Endpoint): string {
  return `${DOCS_BASE_URL}${resolvePath(endpoint)}${resolveQuery(endpoint)}`;
}

function hasBody(endpoint: Endpoint): boolean {
  return Boolean(endpoint.requestExample) && ['POST', 'PATCH', 'PUT'].includes(endpoint.method);
}

function indentJson(value: unknown, indent = 2): string {
  return JSON.stringify(value, null, indent);
}

// ─── Per-language generators ─────────────────────────────────────────────────

function curl(endpoint: Endpoint): string {
  const lines = [`curl -X ${endpoint.method} "${fullUrl(endpoint)}" \\`];
  if (endpoint.auth) lines.push('  -H "Authorization: Bearer $BETTAPAY_TOKEN" \\');
  if (hasBody(endpoint)) {
    lines.push('  -H "Content-Type: application/json" \\');
    if (endpoint.id === 'payments-create') lines.push('  -H "Idempotency-Key: $(uuidgen)" \\');
    lines.push(`  -d '${JSON.stringify(endpoint.requestExample)}'`);
  } else {
    // Drop the trailing continuation on the last line.
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, '');
  }
  return lines.join('\n');
}

function nodeFetch(endpoint: Endpoint): string {
  const headers: string[] = [];
  if (endpoint.auth) headers.push('    Authorization: `Bearer ${process.env.BETTAPAY_TOKEN}`,');
  if (hasBody(endpoint)) headers.push("    'Content-Type': 'application/json',");
  if (endpoint.id === 'payments-create') headers.push("    'Idempotency-Key': crypto.randomUUID(),");

  const init: string[] = [`  method: '${endpoint.method}',`];
  if (headers.length) init.push('  headers: {', ...headers, '  },');
  if (hasBody(endpoint)) init.push(`  body: JSON.stringify(${indentJson(endpoint.requestExample).replace(/\n/g, '\n  ')}),`);

  return [
    `const res = await fetch('${fullUrl(endpoint)}', {`,
    ...init,
    '});',
    '',
    'const { data } = await res.json();',
    'console.log(data);',
  ].join('\n');
}

function nodeAxios(endpoint: Endpoint): string {
  const method = endpoint.method.toLowerCase();
  const headers: string[] = [];
  if (endpoint.auth) headers.push('    Authorization: `Bearer ${process.env.BETTAPAY_TOKEN}`,');
  if (endpoint.id === 'payments-create') headers.push("    'Idempotency-Key': crypto.randomUUID(),");
  const config = headers.length ? `, {\n  headers: {\n${headers.join('\n')}\n  },\n}` : '';

  const args = hasBody(endpoint)
    ? `'${fullUrl(endpoint)}', ${indentJson(endpoint.requestExample).replace(/\n/g, '\n  ')}${config}`
    : `'${fullUrl(endpoint)}'${config}`;

  return [
    "import axios from 'axios';",
    '',
    `const { data } = await axios.${method}(${args});`,
    'console.log(data.data);',
  ].join('\n');
}

function python(endpoint: Endpoint): string {
  const method = endpoint.method.toLowerCase();
  const headers: string[] = [];
  if (endpoint.auth) headers.push('    "Authorization": f"Bearer {token}",');
  if (endpoint.id === 'payments-create') headers.push('    "Idempotency-Key": str(uuid.uuid4()),');
  const headerArg = headers.length ? `\n    headers={\n${headers.join('\n')}\n    },` : '';
  const jsonArg = hasBody(endpoint)
    ? `\n    json=${indentJson(endpoint.requestExample).replace(/: /g, ': ').replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')},`
    : '';

  return [
    'import requests',
    endpoint.id === 'payments-create' ? 'import uuid' : '',
    '',
    `res = requests.${method}(`,
    `    "${fullUrl(endpoint)}",${headerArg}${jsonArg}`,
    ')',
    'res.raise_for_status()',
    'print(res.json()["data"])',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function reactSample(endpoint: Endpoint): string {
  const headers: string[] = [];
  if (endpoint.auth) headers.push('          Authorization: `Bearer ${token}`,');
  if (hasBody(endpoint)) headers.push("          'Content-Type': 'application/json',");
  const init: string[] = [`        method: '${endpoint.method}',`];
  if (headers.length) init.push('        headers: {', ...headers, '        },');
  if (hasBody(endpoint)) init.push(`        body: JSON.stringify(${JSON.stringify(endpoint.requestExample)}),`);

  return [
    "import { useEffect, useState } from 'react';",
    '',
    'function useBettaPay(token) {',
    '  const [data, setData] = useState(null);',
    '',
    '  useEffect(() => {',
    '    const controller = new AbortController();',
    `    fetch('${fullUrl(endpoint)}', {`,
    ...init,
    '      signal: controller.signal,',
    '    })',
    '      .then((r) => r.json())',
    '      .then((json) => setData(json.data))',
    '      .catch(() => {});',
    '    return () => controller.abort();',
    '  }, [token]);',
    '',
    '  return data;',
    '}',
  ].join('\n');
}

const GENERATORS: Record<SampleLanguage, (e: Endpoint) => string> = {
  curl,
  'node-fetch': nodeFetch,
  'node-axios': nodeAxios,
  python,
  react: reactSample,
};

/** Generate a code sample in a single language. */
export function generateSample(endpoint: Endpoint, language: SampleLanguage): CodeSample {
  return {
    language,
    label: SAMPLE_LABELS[language],
    grammar: SAMPLE_GRAMMARS[language],
    code: GENERATORS[language](endpoint),
  };
}

/** Generate all five samples for an endpoint, in tab order. */
export function generateSamples(
  endpoint: Endpoint,
  languages: SampleLanguage[] = ['curl', 'node-fetch', 'node-axios', 'python', 'react'],
): CodeSample[] {
  return languages.map((language) => generateSample(endpoint, language));
}
