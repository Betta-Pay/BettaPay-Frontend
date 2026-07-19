"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  /** The full, copy-pasteable source. Rendered verbatim (whitespace preserved). */
  code: string;
  /** Language label shown in the header, e.g. "bash", "ts", "json". */
  language?: string;
  /** Optional filename shown on the left of the header. */
  filename?: string;
  className?: string;
}

/**
 * Syntax-neutral code block with a copy button. The dark surface is intentional
 * (see the COLOR EXCEPTION LIST in globals.css) so code keeps consistent
 * contrast in both light and dark themes.
 */
export default function CodeBlock({
  code,
  language,
  filename,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — copy manually instead");
    }
  };

  const label = filename ?? language;

  return (
    <div
      className={cn(
        "group/code my-5 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-card",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-2">
        <span className="font-mono text-xs text-slate-400">
          {label ?? "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/60 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-slate-100">{code}</code>
      </pre>
    </div>
  );
}
