import { settlementEndpoints } from '@/lib/docs/endpoints';
import { EndpointBlock } from '../EndpointBlock';
import { SectionShell, P, Code, Ul, Callout } from './primitives';

/** "Settlements" — queue payouts and read their status. */
export function Settlements() {
  return (
    <SectionShell
      id="settlements"
      title="Settlements"
      lead="Settlements move a merchant's USDC balance out to fiat or another destination. The settlement engine processes them in batches under per-merchant limits."
    >
      <P>Every settlement you create is validated against your merchant limits before it is queued:</P>
      <Ul>
        <li>
          <span className="font-medium text-foreground">Minimum</span> — amounts below the merchant
          minimum are rejected.
        </li>
        <li>
          <span className="font-medium text-foreground">Maximum</span> — a single settlement cannot
          exceed the per-transaction maximum.
        </li>
        <li>
          <span className="font-medium text-foreground">Daily limit</span> — the sum of a day&apos;s
          settlements cannot exceed the daily cap.
        </li>
      </Ul>
      <Callout variant="info" title="Batch processing">
        Queued settlements are collected and processed by the settlement engine on its own schedule,
        so a newly created settlement starts as <Code>pending</Code> and transitions to{' '}
        <Code>processing</Code> then <Code>completed</Code> once the batch clears on-chain. Exceeding
        a limit returns <Code>403 FORBIDDEN</Code>.
      </Callout>

      <div className="mt-8 space-y-8">
        {settlementEndpoints.map((endpoint) => (
          <EndpointBlock key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </SectionShell>
  );
}
