import { merchantEndpoints } from '@/lib/docs/endpoints';
import { EndpointBlock } from '../EndpointBlock';
import { SectionShell, P } from './primitives';

/** "Merchants" — CRUD for merchant profiles. */
export function Merchants() {
  return (
    <SectionShell
      id="merchants"
      title="Merchants"
      lead="A merchant is the account that owns payments and settlements. The merchant your JWT acts as is fixed by the merchantId claim in the token."
    >
      <P>
        All merchant routes require a Bearer JWT and only ever read or mutate the merchant you own.
        Attempting to access another merchant returns <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">403 FORBIDDEN</code>.
      </P>
      <div className="mt-8 space-y-8">
        {merchantEndpoints.map((endpoint) => (
          <EndpointBlock key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </SectionShell>
  );
}
