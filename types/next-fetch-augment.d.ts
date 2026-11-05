/*
 * Committed stand-in for the .gitignored `next-env.d.ts` so SDK snippet
 * typechecking (`npm run typecheck:snippets`) sees Next.js's global fetch
 * additions (`next` property in RequestInit) on CI, where no `next build`
 * has ever run to generate the real file.
 */
/// <reference types="next" />
/// <reference types="next/image-types/global" />

export {};
