#!/usr/bin/env node
// Writes every TypeScript SDK snippet the docs show to `.snippet-check/` so
// `tsc -p tsconfig.snippets.json` can compile each one against the SDK
// declaration in `lib/sdks/sdk.d.ts`. Run via `npm run typecheck:snippets`.
//
// The snippet sources are TypeScript modules, so they are transpiled with the
// repo's own `typescript` package and evaluated in a small CommonJS sandbox;
// `@/` aliases are resolved against the repo root.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const cache = new Map();

function resolveModule(request, fromDir) {
  const base = request.startsWith('@/') ? path.join(root, request.slice(2)) : path.resolve(fromDir, request);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  cache.set(file, module);
  const localRequire = (request) => {
    const resolved = request.startsWith('@/') || request.startsWith('.') ? resolveModule(request, path.dirname(file)) : null;
    return resolved ? load(resolved) : require(request);
  };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: localRequire, process });
  return module.exports;
}

const { getTypeScriptSnippets } = load(path.join(root, 'lib/sdks/samples.ts'));
const snippets = getTypeScriptSnippets();

const outDir = path.join(root, '.snippet-check');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const [name, code] of Object.entries(snippets)) {
  // `export {}` makes each file a module so top-level `await` and the
  // per-snippet `client` / `payment` bindings never collide across files.
  fs.writeFileSync(path.join(outDir, `${name}.ts`), `export {};\n${code}\n`);
}

console.log(`Extracted ${Object.keys(snippets).length} TypeScript snippets to .snippet-check/`);
