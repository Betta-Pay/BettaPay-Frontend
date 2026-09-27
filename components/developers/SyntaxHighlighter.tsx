'use client';

/**
 * Syntax highlighting for the developer docs code examples.
 *
 * #771: only Shiki's tiny regex engine and two themes ship with the app
 * chunk. Language grammars are never bundled — each one resolves via its own
 * dynamic chunk the first time a code block requests it, so unused grammars
 * cost nothing.
 *
 * Two layers of caching, both module-scoped singletons:
 * - one highlighter instance for the whole app (`getSingletonHighlighterCore`),
 *   and
 * - one cached promise per language (`getHighlighterForLanguage`), so repeated
 *   renders, multiple code blocks on a page, and re-highlighting after a
 *   language switch never re-trigger a redundant load. Concurrent requests for
 *   the same language share the in-flight promise.
 *
 * Unknown or unsupported languages degrade gracefully to plain text.
 */

import { useEffect, useRef, useState } from 'react';
import type { LanguageRegistration } from 'shiki/core';
import { type Language } from './codeSnippets';
import { SafeHtmlRenderer } from '@/components/shared/SafeHtmlRenderer';

interface SyntaxHighlighterProps {
  code: string;
  language: Language;
}

/** App-facing language names → Shiki grammar ids/aliases. */
const languageMap: Record<Language, string> = {
  javascript: 'js',
  python: 'py',
  php: 'php',
  go: 'go',
};

/**
 * Per-language grammar loaders. Each `import()` becomes a separate chunk, so
 * only grammars actually rendered are ever downloaded; the rest never reach
 * the app bundle. The ids are app-facing names here — resolved to grammar
 * module ids by `resolveGrammarId` below.
 */
const languageLoaders: Record<
  Language,
  () => Promise<{ default: LanguageRegistration[] }>
> = {
  javascript: () => import('@shikijs/langs/js'),
  python: () => import('@shikijs/langs/python'),
  php: () => import('@shikijs/langs/php'),
  go: () => import('@shikijs/langs/go'),
};

/**
 * Ids whose grammars are fetched eagerly alongside the engine, as a warm
 * cache for the doc pages' default tab (the codebase today only renders
 * these four languages; anything else added to `languageLoaders` would load
 * on demand exactly the same way).
 */
const EAGER_LANGUAGES: readonly Language[] = ['javascript', 'python', 'php', 'go'];

type ShikiCoreModule = typeof import('shiki/core');

// Lazy-loaded singleton — the core module (engine + grammar host) is only
// fetched once, on first use.
let corePromise: Promise<ShikiCoreModule> | null = null;

function loadShikiCore(): Promise<ShikiCoreModule> {
  if (!corePromise) {
    corePromise = import('shiki/core');
  }
  return corePromise;
}

// One highlighter for the whole app; one cached promise per language.
type Highlighter = Awaited<
  ReturnType<ShikiCoreModule['getSingletonHighlighterCore']>
>;
let highlighterPromise: Promise<Highlighter> | null = null;
const languagePromiseCache = new Map<Language, Promise<void>>();

async function getHighlighterForLanguage(
  language: Language,
): Promise<Highlighter> {
  const shiki = await loadShikiCore();

  if (!highlighterPromise) {
    // Warm the engine plus the grammars the docs currently use. Everything
    // else a future caller adds to `languageLoaders` still loads on demand.
    const themes = await Promise.all([
      import('@shikijs/themes/github-light'),
      import('@shikijs/themes/github-dark'),
    ]);
    highlighterPromise = shiki.getSingletonHighlighterCore({
      engine: shiki.createJavaScriptRegexEngine({ forgiving: true }),
      themes: themes.map((theme) => theme.default),
      langs: EAGER_LANGUAGES.map((language) => languageLoaders[language]),
    });
  }

  const highlighter = await highlighterPromise;

  // Deduplicate concurrent and repeated requests for the same language:
  // `loadLanguage` is idempotent, but caching the promise avoids the call
  // entirely for already-loaded (or in-flight) grammars.
  let languagePromise = languagePromiseCache.get(language);
  if (!languagePromise) {
    const grammar = await languageLoaders[language]();
    languagePromise = highlighter
      .loadLanguage(grammar.default)
      .catch((error) => {
        // Don't cache failures: a transient chunk-load error can be retried.
        languagePromiseCache.delete(language);
        throw error;
      });
    languagePromiseCache.set(language, languagePromise);
  }

  await languagePromise;
  return highlighter;
}

/**
 * Map an app-facing language to the grammar-module id used by
 * `languageLoaders`. Aliases collapse (`javascript` → `js`) so a later
 * contributor adding `typescript` → `ts` etc. shares the same mechanism.
 */
function resolveGrammarId(language: Language): string {
  return languageMap[language] ?? language;
}

export function SyntaxHighlighter({ code, language }: SyntaxHighlighterProps) {
  const [html, setHtml] = useState<string>('');
  const codeRef = useRef(code);
  const langRef = useRef(language);

  // Keep refs in sync so the async callback always reads the latest props.
  codeRef.current = code;
  langRef.current = language;

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        // Language the app doesn't know (not in `languageLoaders`): render as
        // plain text instead of attempting (and failing) to load a grammar
        // that doesn't exist.
        if (!(language in languageLoaders)) {
          if (!cancelled) setHtml(`<pre>${code}</pre>`);
          return;
        }

        const grammarId = resolveGrammarId(language);

        const highlighter = await getHighlighterForLanguage(language);
        if (cancelled) return;

        const result = highlighter.codeToHtml(code, {
          lang: grammarId,
          theme: 'github-light',
        });
        if (!cancelled) setHtml(result);
      } catch (error) {
        console.error('Failed to highlight code:', error);
        if (!cancelled) setHtml(`<pre>${code}</pre>`);
      }
    };

    highlight();
    return () => {
      cancelled = true;
    };
    // Re-highlight whenever the code or requested language changes.
  }, [code, language]);

  return (
    <div className="rounded-xl overflow-x-auto bg-white dark:bg-slate-950">
      <SafeHtmlRenderer
        className="text-sm font-mono leading-relaxed p-5"
        html={html || `<pre>${code}</pre>`}
        style={{
          colorScheme: 'light',
        }}
      />
    </div>
  );
}
