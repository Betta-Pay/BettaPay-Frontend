import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { LanguageRegistration } from 'shiki/core';
import { SyntaxHighlighter } from '../SyntaxHighlighter';

/**
 * #771: the highlighter must lazy-load Shiki languages and cache them, so the
 * tests mock the Shiki module surface (`shiki/core`, per-language grammar
 * modules from `@shikijs/langs/*`, themes) and assert on the *loading
 * behavior* rather than real grammar output (jsdom has no TextMate engine).
 *
 * The component keeps its highlighter/language caches at module scope — that
 * is the production behavior under test — so state persists across tests in
 * this file. Three conventions keep the suite deterministic:
 *
 * 1. Cache-sensitive tests come first, on cold module state, and each uses a
 *    language no earlier test loads (caching → javascript/python, sharing →
 *    php, failed retry → go). The retry test asserts that precondition.
 * 2. Assertions that survive warm state are delta-based (count only NEW
 *    calls caused by the mounts under test).
 * 3. Multi-mount tests unmount between renders so `screen` queries never see
 *    two mounted instances.
 */

const mockLoadLanguage = jest.fn();
const mockCodeToHtml = jest.fn();
const mockGetSingletonHighlighterCore = jest.fn();

/** The grammar arrays the mocked `@shikijs/langs/*` modules default-export. */
const grammars: Record<'js' | 'py' | 'php' | 'go', LanguageRegistration[]> = {
  js: [{ name: 'javascript', aliases: ['js'] }],
  py: [{ name: 'python', aliases: ['py'] }],
  php: [{ name: 'css' }, { name: 'php' }],
  go: [{ name: 'go' }],
};

// `virtual: true` lets the suite mock these subpath modules without needing
// the real packages to resolve in the jest environment.
jest.mock(
  'shiki/core',
  () => ({
    __esModule: true,
    getSingletonHighlighterCore: (...args: unknown[]) =>
      mockGetSingletonHighlighterCore(...args),
    createJavaScriptRegexEngine: () => ({}),
  }),
  { virtual: true },
);
jest.mock(
  '@shikijs/langs/js',
  () => ({ __esModule: true, default: grammars.js }),
  { virtual: true },
);
jest.mock(
  '@shikijs/langs/python',
  () => ({ __esModule: true, default: grammars.py }),
  { virtual: true },
);
jest.mock(
  '@shikijs/langs/php',
  () => ({ __esModule: true, default: grammars.php }),
  { virtual: true },
);
jest.mock(
  '@shikijs/langs/go',
  () => ({ __esModule: true, default: grammars.go }),
  { virtual: true },
);
jest.mock(
  '@shikijs/themes/github-light',
  () => ({ __esModule: true, default: { name: 'github-light' } }),
  { virtual: true },
);
jest.mock(
  '@shikijs/themes/github-dark',
  () => ({ __esModule: true, default: { name: 'github-dark' } }),
  { virtual: true },
);

jest.mock('@/components/shared/SafeHtmlRenderer', () => ({
  SafeHtmlRenderer: ({ html }: { html: string }) => (
    <div data-testid="safe-html" dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

type LanguageProp = 'javascript' | 'python' | 'php' | 'go';

/** App language → shiki grammar id, mirroring the component's languageMap. */
const grammarIdFor: Record<LanguageProp, keyof typeof grammars> = {
  javascript: 'js',
  python: 'py',
  php: 'php',
  go: 'go',
};

function renderHighlighter(props: { code: string; language: LanguageProp }) {
  return render(<SyntaxHighlighter {...props} />);
}

/** Count of loadLanguage calls that received a given grammar array. */
function loadCount(grammar: LanguageRegistration[]): number {
  return mockLoadLanguage.mock.calls.filter(
    (call) => call[0] === grammar,
  ).length;
}

/** Flush pending microtask chains (failed-load cache cleanup, etc.). */
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

const DEFAULT_CODE_TO_HTML = (code: string) =>
  `<pre class="shiki">${code}-highlighted</pre>`;

beforeEach(() => {
  // mockReset (not clearAllMocks) so a previous test's failure simulation
  // doesn't leak its implementation into the next one.
  mockLoadLanguage.mockReset().mockResolvedValue(undefined);
  mockCodeToHtml.mockReset().mockImplementation(DEFAULT_CODE_TO_HTML);
  mockGetSingletonHighlighterCore
    .mockReset()
    .mockResolvedValue({
      loadLanguage: mockLoadLanguage,
      codeToHtml: mockCodeToHtml,
    });
});

describe('SyntaxHighlighter', () => {
  /**
   * First test — cold module cache. Exactly one grammar load per language,
   * none for re-renders of the same language, one more for a language switch.
   */
  it('loads each language once and caches it across re-renders', async () => {
    const utils = renderHighlighter({ code: 'const x = 1;', language: 'javascript' });

    await waitFor(() => {
      expect(screen.getByTestId('safe-html').innerHTML).toContain(
        'const x = 1;-highlighted',
      );
    });
    expect(mockLoadLanguage).toHaveBeenCalledTimes(1);
    expect(mockLoadLanguage).toHaveBeenCalledWith(grammars.js);
    expect(mockCodeToHtml).toHaveBeenCalledWith(
      'const x = 1;',
      expect.objectContaining({ lang: 'js', theme: 'github-light' }),
    );

    // Re-render with different code, same language: no redundant load.
    utils.rerender(<SyntaxHighlighter code="const y = 2;" language="javascript" />);
    await waitFor(() => {
      expect(mockCodeToHtml).toHaveBeenCalledWith('const y = 2;', expect.anything());
    });
    expect(mockLoadLanguage).toHaveBeenCalledTimes(1);

    // Switching language loads only the new grammar.
    utils.rerender(<SyntaxHighlighter code="print('hi')" language="python" />);
    await waitFor(() => {
      expect(mockCodeToHtml).toHaveBeenCalledWith(
        "print('hi')",
        expect.objectContaining({ lang: 'py' }),
      );
    });
    expect(mockLoadLanguage).toHaveBeenCalledTimes(2);

    utils.unmount();
  });

  /**
   * Second test — php is still cold (only js/py loaded above). Two mounted
   * instances must share one highlighter and one cached language load.
   */
  it('shares one highlighter and cached language loads across multiple instances', async () => {
    const loadBefore = loadCount(grammars.php);
    const singletonBefore = mockGetSingletonHighlighterCore.mock.calls.length;

    const first = renderHighlighter({ code: 'a', language: 'php' });
    await waitFor(() => {
      expect(mockCodeToHtml).toHaveBeenCalledWith('a', expect.anything());
    });
    // First mount loads php exactly once.
    expect(loadCount(grammars.php)).toBe(loadBefore + 1);

    const second = renderHighlighter({ code: 'b', language: 'php' });
    await waitFor(() => {
      expect(mockCodeToHtml).toHaveBeenCalledWith('b', expect.anything());
    });
    // Second mount: no new language load…
    expect(loadCount(grammars.php)).toBe(loadBefore + 1);
    // …and no new highlighter instance (delta ignores the warm singleton).
    expect(mockGetSingletonHighlighterCore.mock.calls.length).toBe(singletonBefore);

    first.unmount();
    second.unmount();
  });

  /**
   * Third test — go must still be cold here (guard below fails loudly if the
   * test order changes). A failed grammar load must not be cached, so a fresh
   * mount retries instead of replaying the failure forever.
   */
  it('does not cache a failed language load — a retry can succeed', async () => {
    expect(loadCount(grammars.go)).toBe(0);

    mockLoadLanguage.mockRejectedValueOnce(new Error('chunk load failed'));

    const first = renderHighlighter({ code: 'x', language: 'go' });
    await waitFor(() => {
      expect(loadCount(grammars.go)).toBe(1);
    });
    // Let the rejection settle and the component fall back to plain text.
    await flushAsync();
    expect(screen.getByTestId('safe-html').innerHTML).toBe('<pre>x</pre>');
    expect(mockCodeToHtml).not.toHaveBeenCalled();
    first.unmount();

    // A fresh mount retries the load (success this time) and highlights.
    const second = renderHighlighter({ code: 'x', language: 'go' });
    await waitFor(() => {
      expect(screen.getByTestId('safe-html').innerHTML).toContain('-highlighted');
    });

    expect(loadCount(grammars.go)).toBe(2);
    second.unmount();
  });

  it('highlights every language prop used by call sites', async () => {
    const cases: LanguageProp[] = ['javascript', 'python', 'php', 'go'];

    for (const language of cases) {
      const utils = renderHighlighter({ code: `// ${language}`, language });

      await waitFor(() => {
        expect(mockCodeToHtml).toHaveBeenCalledWith(
          `// ${language}`,
          expect.objectContaining({ lang: grammarIdFor[language] }),
        );
      });

      utils.unmount();
    }
  });

  it('renders a plain <pre> fallback for an unknown language without crashing', async () => {
    const before = mockLoadLanguage.mock.calls.length;

    const utils = renderHighlighter({
      code: '???',
      // @ts-expect-error — deliberately out-of-domain input.
      language: 'klingon',
    });

    await waitFor(() => {
      expect(screen.getByTestId('safe-html').innerHTML).toBe('<pre>???</pre>');
    });
    // No grammar load was attempted for the unknown language.
    expect(mockLoadLanguage.mock.calls.length).toBe(before);
    expect(mockCodeToHtml).not.toHaveBeenCalledWith('???', expect.anything());

    utils.unmount();
  });

  it('falls back to plain text when highlighting throws', async () => {
    mockCodeToHtml.mockImplementation(() => {
      throw new Error('boom');
    });

    const utils = renderHighlighter({ code: 'fallback code', language: 'javascript' });

    await waitFor(() => {
      expect(screen.getByTestId('safe-html').innerHTML).toBe(
        '<pre>fallback code</pre>',
      );
    });

    utils.unmount();
  });
});
