import { createHighlighter, type Highlighter } from 'shiki';

// Server-side syntax highlighting. Runs at build/render time in React Server
// Components so the client never ships Shiki's grammars or themes — the page
// only sends pre-rendered HTML plus the tiny copy/tab-switch client islands.
//
// Dual-theme output (`defaultColor: false`) emits both light and dark colors as
// CSS variables per token; `components/docs/CodeBlock.tsx` + globals.css switch
// between them under the `.dark` class with no re-highlight and no flash.

const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark-default';

// Languages used by the docs code samples (see `lib/docs/snippets.ts`).
const LANGS = ['bash', 'javascript', 'typescript', 'tsx', 'python', 'json', 'http'] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

/** Map arbitrary grammar aliases onto a language we actually loaded. */
function resolveLang(lang: string): string {
  const alias: Record<string, string> = {
    sh: 'bash',
    shell: 'bash',
    js: 'javascript',
    jsx: 'tsx',
    ts: 'typescript',
    py: 'python',
  };
  const resolved = alias[lang] ?? lang;
  return (LANGS as readonly string[]).includes(resolved) ? resolved : 'text';
}

/**
 * Highlight `code` to a theme-aware HTML string. Safe to call from any Server
 * Component; the underlying highlighter is created once and reused.
 */
export async function highlight(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: resolveLang(lang),
    themes: { light: LIGHT_THEME, dark: DARK_THEME },
    defaultColor: false,
    colorReplacements: {},
  });
}
