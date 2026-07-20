import { highlight } from '@/lib/docs/highlight';
import { CodeBlock } from '../CodeBlock';

interface SnippetProps {
  code: string;
  /** Shiki grammar/alias (bash, javascript, tsx, python, json, http). */
  lang: string;
  /** Optional filename/label for the header bar. */
  filename?: string;
  className?: string;
}

/**
 * Async server helper: highlights a raw code string and renders it in a
 * CodeBlock. Lets content sections drop in a highlighted snippet without
 * threading Shiki through the client.
 */
export async function Snippet({ code, lang, filename, className }: SnippetProps) {
  const html = await highlight(code, lang);
  return <CodeBlock code={code} html={html} language={filename ? undefined : lang} filename={filename} className={className} />;
}
