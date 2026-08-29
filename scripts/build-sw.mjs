/**
 * Builds the production service worker with workbox-build + rollup.
 *
 * Runs after `next build` (see the `build` script in package.json) so the
 * precache manifest can reference the hashed assets in `.next/static`.
 * Output: `public/sw.js`, which Next serves at `/sw.js`.
 *
 * Pipeline:
 *  1. Bake NEXT_PUBLIC_API_URL into scripts/sw-template.js (its imports of the
 *     workbox runtime are not bundleable by injectManifest alone).
 *  2. Bundle the template with rollup so the workbox runtime modules are
 *     inlined into a single self-contained file.
 *  3. injectManifest replaces `self.__WB_MANIFEST` with the precache manifest
 *     (hashed `.next/static` assets plus stable public URLs) and writes
 *     `public/sw.js`.
 */
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { injectManifest } from 'workbox-build';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(root, '.next');
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 1. Bake the API origin into the template so the service worker can match
//    cross-origin backend requests (same-origin `/api/*` is always matched).
mkdirSync(buildDir, { recursive: true });
const template = readFileSync(join(root, 'scripts/sw-template.js'), 'utf8');
const withOrigin = template.replace(
  '__API_ORIGIN_JSON__',
  JSON.stringify(apiOrigin.trim().replace(/\/+$/, '')),
);
const templatePath = join(buildDir, 'sw-template.generated.js');
writeFileSync(templatePath, withOrigin);

// 2. Bundle the workbox runtime imports into a single file. `process.env.NODE_ENV`
//    must be inlined (workbox-build does the same) or the worker throws a
//    ReferenceError at evaluation and never installs.
const bundle = await rollup({
  input: templatePath,
  plugins: [
    nodeResolve(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  },
});
const bundledPath = join(buildDir, 'sw-bundled.js');
await bundle.write({ file: bundledPath, format: 'es' });
await bundle.close();

// 3. Inject the precache manifest and write public/sw.js.
const { count, size, warnings } = await injectManifest({
  swSrc: bundledPath,
  swDest: join(root, 'public/sw.js'),
  // Precache the Next.js build output. URLs are rewritten below from
  // `static/...` to the real `/_next/static/...` paths.
  globDirectory: join(root, '.next/static'),
  globPatterns: ['**/*.{js,css,woff2,woff,ttf,otf,png,svg,ico,webp,avif,json}'],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  modifyURLPrefix: { '': '/_next/static/' },
  // Static public assets referenced by the manifest / shell (icons, logo).
  // revision: null keeps the URLs stable across builds.
  additionalManifestEntries: [
    { url: '/manifest.webmanifest', revision: null },
    { url: '/icons/icon-192.png', revision: null },
    { url: '/icons/icon-512.png', revision: null },
    { url: '/icons/icon-maskable-512.png', revision: null },
    { url: '/icons/apple-touch-icon.png', revision: null },
    { url: '/logo.png', revision: null },
  ],
});

for (const warning of warnings) {
  console.warn(`[build-sw] ${warning}`);
}

console.log(
  `[build-sw] public/sw.js written — ${count} precached assets (${(size / 1024 / 1024).toFixed(2)} MiB), API origin ${apiOrigin}`,
);
