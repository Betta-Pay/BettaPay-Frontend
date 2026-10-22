"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui";
import { copyToClipboard, normalizeCopiedText } from "@/lib/sdks/copy";

interface CopyableCodeProps {
  /** Exact text shown, and exact text copied (after prompt normalization). */
  code: string;
  label: string;
}

/**
 * A code block whose clipboard contents are guaranteed to match what is on
 * screen: the `<pre>` renders `code` verbatim, and the copy button and the
 * native copy event both hand the same string through `normalizeCopiedText`,
 * which leaves source code untouched and only strips transcript prompts.
 */
export function CopyableCode({ code, label }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Selecting part of the block and pressing Ctrl/Cmd+C gets the same prompt
  // handling as the button.
  const handleNativeCopy = (event: React.ClipboardEvent) => {
    const selection = window.getSelection()?.toString();
    if (!selection) return;
    event.clipboardData.setData("text/plain", normalizeCopiedText(selection));
    event.preventDefault();
  };

  return (
    <div className="relative rounded-lg border bg-muted/50">
      <Button
        variant="ghost"
        size="icon-xs"
        className="absolute right-2 top-2"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>
      <pre
        tabIndex={0}
        aria-label={label}
        onCopy={handleNativeCopy}
        className="overflow-x-auto p-4 pr-12 text-xs leading-relaxed font-mono text-foreground"
      >
        {code}
      </pre>
      <span role="status" className="sr-only">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}
