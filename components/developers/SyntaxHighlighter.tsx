'use client';

/**
 * Syntax highlighting for the developer docs code examples.
 *
 * #771: only Shiki's tiny regex engine and two themes ship with the app
 * chunk. Language grammars are never bundled — each one resolves via its own
 * dynamic chunk the first time a code block requests it, so unused grammars
 * cost nothing.
 *
 * Caching is delegated to the shared singleton in `lib/utils/highlighter.ts`,
 * so the Shiki core, the JavaScript regex engine, the themes and the WASM-free
 * highlighter instance are initialized exactly once per app, no matter how
 * many code blocks are rendered on a page.
 *
 * Unknown or unsupported languages degrade gracefully to plain text.
 */

import { useEffect, useRef, useState } from 'react';
import { type Language } from './codeSnippets';
import { SafeHtmlRenderer } from '@/components/shared/SafeHtmlRenderer';
import {
  getHighlighterForLanguage,
  hasLanguage,
  resolveGrammarId,
} from '@/lib/utils/highlighter';

interface SyntaxHighlighterProps {
  code: string;
  language: Language;
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
        // Language the app doesn't know: render as plain text instead of
        // attempting (and failing) to load a grammar that doesn't exist.
        if (!hasLanguage(language)) {
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
