import type { LanguageRegistration } from 'shiki/core';

/**
 * App-facing language names → Shiki grammar ids/aliases.
 */
const languageMap = {
  javascript: 'js',
  python: 'py',
  php: 'php',
  go: 'go',
} as const;

export type SupportedLanguage = keyof typeof languageMap;

/**
 * Per-language grammar loaders. Each `import()` becomes a separate chunk, so
 * only grammars actually rendered are ever downloaded; the rest never reach
 * the app bundle.
 */
const languageLoaders: Record<
  SupportedLanguage,
  () => Promise<{ default: LanguageRegistration[] }>
> = {
  javascript: () => import('@shikijs/langs/js'),
  python: () => import('@shikijs/langs/python'),
  php: () => import('@shikijs/langs/php'),
  go: () => import('@shikijs/langs/go'),
};

/**
 * Grammars warmed alongside the engine for the docs' default tabs. Any other
 * supported language still loads on demand.
 */
const EAGER_LANGUAGES: readonly SupportedLanguage[] = [
  'javascript',
  'python',
  'php',
  'go',
];

type ShikiCoreModule = typeof import('shiki/core');
type ShikiEngineModule = typeof import('shiki/engine/javascript');

// Lazy-loaded singletons — the core and engine modules are only fetched once,
// on first use.
let corePromise: Promise<ShikiCoreModule> | null = null;

function loadShikiCore(): Promise<ShikiCoreModule> {
  if (!corePromise) {
    corePromise = import('shiki/core');
  }
  return corePromise;
}

let enginePromise: Promise<ShikiEngineModule> | null = null;

function loadShikiEngine(): Promise<ShikiEngineModule> {
  if (!enginePromise) {
    enginePromise = import('shiki/engine/javascript');
  }
  return enginePromise;
}

// One highlighter for the whole app; one cached promise per language.
type Highlighter = Awaited<
  ReturnType<ShikiCoreModule['getSingletonHighlighterCore']>
>;
let highlighterPromise: Promise<Highlighter> | null = null;
const languagePromiseCache = new Map<SupportedLanguage, Promise<void>>();

/** Whether the app has a grammar loader for a language. */
export function hasLanguage(language: string): language is SupportedLanguage {
  return Object.prototype.hasOwnProperty.call(languageLoaders, language);
}

/**
 * Map an app-facing language to the grammar-module id used by
 * `languageLoaders`. Aliases collapse (`javascript` → `js`) so a later
 * contributor adding `typescript` → `ts` etc. shares the same mechanism.
 */
export function resolveGrammarId(language: string): string {
  return languageMap[language as SupportedLanguage] ?? language;
}

/**
 * Return the shared highlighter with the requested language loaded.
 *
 * Concurrent and repeated requests for the same language share one cached
 * promise. Failures are not cached so a transient chunk-load error can retry.
 */
export async function getHighlighterForLanguage(
  language: SupportedLanguage,
): Promise<Highlighter> {
  const [shiki, shikiEngine] = await Promise.all([
    loadShikiCore(),
    loadShikiEngine(),
  ]);

  if (!highlighterPromise) {
    const themes = await Promise.all([
      import('@shikijs/themes/github-light'),
      import('@shikijs/themes/github-dark'),
    ]);
    highlighterPromise = shiki.getSingletonHighlighterCore({
      engine: shikiEngine.createJavaScriptRegexEngine({ forgiving: true }),
      themes: themes.map((theme) => theme.default),
      langs: EAGER_LANGUAGES.map(
        (eagerLanguage) => languageLoaders[eagerLanguage],
      ),
    });
  }

  const highlighter = await highlighterPromise;

  let languagePromise = languagePromiseCache.get(language);
  if (!languagePromise) {
    const grammar = await languageLoaders[language]();
    languagePromise = highlighter
      .loadLanguage(grammar.default)
      .catch((error) => {
        languagePromiseCache.delete(language);
        throw error;
      });
    languagePromiseCache.set(language, languagePromise);
  }

  await languagePromise;
  return highlighter;
}
