'use client';

import { useEffect, useRef, useState } from 'react';
import { type Language } from './codeSnippets';

interface SyntaxHighlighterProps {
  code: string;
  language: Language;
}

const languageMap: Record<Language, string> = {
  javascript: 'js',
  python: 'py',
  php: 'php',
  go: 'go',
};

// Lazy-loaded singleton — shiki is only fetched once, on first use.
let shikiPromise: Promise<typeof import('shiki')> | null = null;

function loadShiki() {
  if (!shikiPromise) {
    shikiPromise = import('shiki');
  }
  return shikiPromise;
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
        const shiki = await loadShiki();
        if (cancelled) return;

        const highlighter = await shiki.createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: ['js', 'py', 'php', 'go'],
        });
        if (cancelled) return;

        const result = highlighter.codeToHtml(codeRef.current, {
          lang: languageMap[langRef.current],
          theme: 'github-light',
        });
        if (!cancelled) setHtml(result);
      } catch (error) {
        console.error('Failed to initialize syntax highlighter:', error);
        if (!cancelled) setHtml(`<pre>${codeRef.current}</pre>`);
      }
    };

    highlight();
    return () => { cancelled = true; };
  }, []);

  // If the code or language changes after initial load, re-highlight.
  useEffect(() => {
    if (!html) return;

    let cancelled = false;

    const rehighlight = async () => {
      try {
        const shiki = await loadShiki();
        if (cancelled) return;

        const highlighter = await shiki.createHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: ['js', 'py', 'php', 'go'],
        });
        if (cancelled) return;

        const result = highlighter.codeToHtml(code, {
          lang: languageMap[language],
          theme: 'github-light',
        });
        if (!cancelled) setHtml(result);
      } catch (error) {
        console.error('Failed to highlight code:', error);
        if (!cancelled) setHtml(`<pre>${code}</pre>`);
      }
    };

    rehighlight();
    return () => { cancelled = true; };
  }, [code, language, html]);

  return (
    <div className="rounded-xl overflow-x-auto bg-white dark:bg-slate-950">
      <div
        className="text-sm font-mono leading-relaxed p-5"
        dangerouslySetInnerHTML={{ __html: html || `<pre>${code}</pre>` }}
        style={{
          colorScheme: 'light',
        }}
      />
    </div>
  );
}
