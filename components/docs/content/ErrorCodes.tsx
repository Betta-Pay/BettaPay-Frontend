import { errorCatalog } from '@/lib/docs/errors';
import { SectionShell, Code, Callout } from './primitives';
import { Snippet } from './Snippet';

const errorShape = `{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amountUsdc must be a positive number",
    "details": [
      { "path": "amountUsdc", "message": "Expected positive number" }
    ]
  }
}`;

function statusTone(status: number): string {
  if (status >= 500) return 'bg-destructive/10 text-destructive';
  if (status === 429) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
}

/** "Error Codes" — the full catalog with causes and resolutions. */
export function ErrorCodes() {
  return (
    <SectionShell
      id="error-codes"
      title="Error Codes"
      lead="Every failure returns the same envelope with a stable, machine-readable code. Branch on error.code — messages may be reworded, codes will not."
    >
      <Snippet code={errorShape} lang="json" filename="Error envelope" />

      {/* Summary table */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="bg-muted/40">
              <th className="py-2.5 pl-4 pr-4 text-xs font-semibold text-muted-foreground">Code</th>
              <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">HTTP</th>
              <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {errorCatalog.map((entry) => (
              <tr key={entry.code} className="border-t border-border align-top">
                <td className="py-2.5 pl-4 pr-4">
                  <a
                    href={`#error-${entry.code.toLowerCase()}`}
                    className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {entry.code}
                  </a>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ${statusTone(entry.status)}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-xs leading-relaxed text-muted-foreground">{entry.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail per code */}
      <div className="mt-10 space-y-6">
        {errorCatalog.map((entry) => (
          <div
            key={entry.code}
            id={`error-${entry.code.toLowerCase()}`}
            className="scroll-mt-24 rounded-2xl border border-border bg-card/40 p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-mono text-sm font-semibold text-foreground">{entry.code}</h4>
              <span className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ${statusTone(entry.status)}`}>
                {entry.status}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.meaning}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Common causes
            </p>
            <ul className="mt-2 ml-1 space-y-1.5 text-sm leading-relaxed text-muted-foreground [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:text-primary [&>li]:before:content-['▸']">
              {entry.causes.map((cause) => (
                <li key={cause}>{cause}</li>
              ))}
            </ul>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              How to resolve
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.resolution}</p>
          </div>
        ))}
      </div>

      <Callout variant="tip" title="Retry only what is retryable">
        <Code>408</Code>, <Code>429</Code>, <Code>500</Code> and <Code>504</Code> are transient —
        retry with exponential backoff and jitter. <Code>400</Code>, <Code>403</Code>,{' '}
        <Code>404</Code> and <Code>409</Code> will fail identically until you change the request.
      </Callout>
    </SectionShell>
  );
}
