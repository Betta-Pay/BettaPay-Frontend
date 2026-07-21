import { fxEndpoints } from '@/lib/docs/endpoints';
import { EndpointBlock } from '../EndpointBlock';
import { SectionShell, P, Code, Callout } from './primitives';

/** "FX & Rates" — read live exchange rates and quotes. */
export function FxRates() {
  return (
    <SectionShell
      id="fx-rates"
      title="FX & Rates"
      lead="The gateway proxies the FX engine so you can read live USDC/fiat rates and price a conversion. These endpoints are public — no JWT required."
    >
      <P>
        Use <Code>/api/rates</Code> to render a rates board and <Code>/api/fx/quote</Code> to price
        a specific amount before creating a payment or settlement. Rates are indicative and may move
        between the quote and on-chain settlement.
      </P>
      <Callout variant="info" title="Upstream timeouts surface as 504">
        Because these routes proxy a downstream engine, an upstream stall returns{' '}
        <Code>504 GATEWAY_TIMEOUT</Code>. Treat it as retryable with backoff.
      </Callout>

      <div className="mt-8 space-y-8">
        {fxEndpoints.map((endpoint) => (
          <EndpointBlock key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </SectionShell>
  );
}
