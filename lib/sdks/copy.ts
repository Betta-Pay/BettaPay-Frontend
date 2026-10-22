/**
 * Copy-with-prompt normalization.
 *
 * Shell and REPL transcripts carry a prompt (`$ npm install`, `>>> print(x)`)
 * that is noise once pasted into a terminal. `normalizeCopiedText` strips it —
 * but only when the whole block is recognisably a transcript, so source code
 * is never touched: a Python `# Output:` comment or a Go `// Output:` line has
 * to survive a copy unchanged, because what lands on the clipboard must equal
 * what is displayed.
 */

const SHELL_PROMPT = /^(\s*)\$ /;
const REPL_PROMPT = /^(\s*)(>>> |\.\.\. )/;
const QUOTE_PROMPT = /^(\s*)> /;

function nonEmptyLines(lines: string[]): string[] {
  return lines.filter((line) => line.trim() !== '');
}

export function normalizeCopiedText(text: string): string {
  const lines = text.split('\n');
  const content = nonEmptyLines(lines);
  if (content.length === 0) return text;

  // Shell transcript: first command line starts with `$ `. Output lines that
  // follow (no prompt) are left alone.
  if (SHELL_PROMPT.test(content[0])) {
    return lines.map((line) => line.replace(SHELL_PROMPT, '$1')).join('\n');
  }

  // Python REPL: first line starts with `>>> `. Continuation prompts go too.
  if (/^\s*>>> /.test(content[0])) {
    return lines.map((line) => line.replace(REPL_PROMPT, '$1')).join('\n');
  }

  // `> ` is only a prompt when every non-empty line carries it (PowerShell /
  // cmd transcripts); a lone `>` inside code is a comparison, not a prompt.
  if (content.every((line) => QUOTE_PROMPT.test(line))) {
    return lines.map((line) => line.replace(QUOTE_PROMPT, '$1')).join('\n');
  }

  return text;
}

/** Write normalized text to the clipboard. Returns the exact string written. */
export async function copyToClipboard(text: string): Promise<string> {
  const normalized = normalizeCopiedText(text);
  await navigator.clipboard.writeText(normalized);
  return normalized;
}
