import { httpStatuses } from '@/lib/docs/errors';
import { SectionShell, SubSection, P, Code, Ul } from './primitives';
import { Snippet } from './Snippet';

const rateLimitHeaders = `HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }`;

function tone(status: number): string {
  if (status < 300) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (status >= 500) return 'bg-destructive/10 text-destructive';
  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
}

/** "HTTP Status" — status mapping, rate limits and timeouts. */
export function HttpStatus() {
  return (
    <SectionShell
      id="http-status"
      title="HTTP Status"
      lead="How the gateway maps outcomes onto HTTP status codes, plus the rate limits and timeouts that govern every route."
    >
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="bg-muted/40">
              <th className="py-2.5 pl-4 pr-4 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Name</th>
              <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {httpStatuses.map((entry) => (
              <tr key={entry.status} className="border-t border-border align-top">
                <td className="py-2.5 pl-4 pr-4">
                  <span className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ${tone(entry.status)}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-xs font-medium text-foreground">{entry.name}</td>
                <td className="py-2.5 pr-4 text-xs leading-relaxed text-muted-foreground">{entry.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubSection id="rate-limits" title="Rate limits">
        <P>Limits are applied per IP, per route class:</P>
        <Ul>
          <li>
            <span className="font-medium text-foreground">1000 req/min</span> — global default across
            the gateway.
          </li>
          <li>
            <span className="font-medium text-foreground">100 req/min</span> — auth endpoints
            (<Code>/api/auth/*</Code>).
          </li>
          <li>
            <span className="font-medium text-foreground">30 req/min</span> — state-changing routes
            (POST, PATCH, DELETE).
          </li>
        </Ul>
        <P>
          When you exceed a limit the response is <Code>429</Code> with a <Code>Retry-After</Code>{' '}
          header in seconds. Wait at least that long before retrying.
        </P>
        <Snippet code={rateLimitHeaders} lang="http" filename="429 response" />
      </SubSection>

      <SubSection id="timeouts" title="Timeouts">
        <P>
          The gateway enforces a <span className="font-medium text-foreground">30 second</span>{' '}
          request timeout and a <span className="font-medium text-foreground">31 second</span>{' '}
          connection timeout. A request that exceeds these returns <Code>408 REQUEST_TIMEOUT</Code>;
          a slow downstream engine surfaces as <Code>504 GATEWAY_TIMEOUT</Code>. Set your client
          timeout slightly above 30s so you observe the gateway&apos;s own error rather than
          aborting first.
        </P>
      </SubSection>
    </SectionShell>
  );
}
