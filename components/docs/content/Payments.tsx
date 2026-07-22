import { paymentEndpoints } from '@/lib/docs/endpoints';
import { EndpointBlock } from '../EndpointBlock';
import { SectionShell, SubSection, P, Code, Callout } from './primitives';

/** "Payments" — CRUD plus the status lifecycle. */
export function Payments() {
  return (
    <SectionShell
      id="payments"
      title="Payments"
      lead="Create payments (and hosted payment links), read their status as they settle on Stellar, and advance them through their lifecycle."
    >
      <SubSection id="payment-lifecycle" title="Status lifecycle">
        <P>
          A payment moves forward through a fixed set of states. Only forward transitions are
          allowed — the gateway rejects illegal moves (for example <Code>completed → pending</Code>)
          with <Code>409 IDEMPOTENCY_CONFLICT</Code>.
        </P>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {['pending', 'processing', 'completed'].map((s) => (
            <span key={s} className="rounded-md bg-muted px-2 py-1 font-mono text-foreground">
              {s}
            </span>
          ))}
          <span className="text-muted-foreground">— or —</span>
          {['failed', 'expired'].map((s) => (
            <span key={s} className="rounded-md bg-destructive/10 px-2 py-1 font-mono text-destructive">
              {s}
            </span>
          ))}
        </div>
        <Callout variant="tip" title="Use idempotency keys when creating payments">
          Network retries are inevitable. Send an <Code>Idempotency-Key</Code> on{' '}
          <Code>POST /api/payments</Code> so a retried create returns the original payment instead
          of a duplicate charge. See{' '}
          <a href="#idempotency-keys" className="text-primary underline-offset-4 hover:underline">
            Idempotency Keys
          </a>
          .
        </Callout>
      </SubSection>

      <div className="mt-10 space-y-8">
        {paymentEndpoints.map((endpoint) => (
          <EndpointBlock key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </SectionShell>
  );
}
