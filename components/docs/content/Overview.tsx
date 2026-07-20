import { DOCS_BASE_URL } from '@/lib/docs/navigation';
import { SectionShell, SubSection, P, Code, Ul, Callout } from './primitives';
import { Snippet } from './Snippet';

const successEnvelope = `{
  "data": {
    "id": "9b2f...",
    "amountUsdc": 25.00,
    "status": "pending"
  }
}`;

const errorEnvelope = `{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amountUsdc must be a positive number",
    "details": [
      { "path": "amountUsdc", "message": "Expected positive number" }
    ]
  }
}`;

/** "Overview" — what the API is, the base URL, and the response envelope. */
export function Overview() {
  return (
    <SectionShell
      id="overview"
      title="Overview"
      lead="The BettaPay API lets you accept USDC payments on Stellar, settle to fiat, register merchants and read live FX rates — all over a small, predictable REST surface."
    >
      <SubSection id="overview-base-url" title="Base URL">
        <P>Every endpoint in this reference is relative to a single gateway host:</P>
        <Snippet code={DOCS_BASE_URL} lang="bash" filename="Base URL" />
        <P>
          The gateway is a Fastify service that fronts the merchant, payment, settlement and FX
          engines. You only ever talk to this host — internal service topology is not exposed.
        </P>
      </SubSection>

      <SubSection id="overview-conventions" title="Conventions">
        <Ul>
          <li>
            All requests and responses are JSON. Send <Code>Content-Type: application/json</Code> on
            any request with a body.
          </li>
          <li>
            Authenticated routes expect a <Code>Authorization: Bearer &lt;jwt&gt;</Code> header. See{' '}
            <a href="#authentication" className="text-primary underline-offset-4 hover:underline">
              Authentication
            </a>
            .
          </li>
          <li>
            Timestamps are ISO&nbsp;8601 strings in UTC. Monetary amounts use decimal numbers
            (USDC) — never floats-as-strings.
          </li>
          <li>
            Request bodies are normalized server-side (Unicode NFC, control characters stripped)
            before validation.
          </li>
          <li>
            The gateway enforces a 30s request timeout and per-route rate limits. See{' '}
            <a href="#http-status" className="text-primary underline-offset-4 hover:underline">
              HTTP Status
            </a>
            .
          </li>
        </Ul>
      </SubSection>

      <SubSection id="overview-response-format" title="Response format">
        <P>
          Successful responses wrap their payload in a <Code>data</Code> envelope. This keeps the
          shape stable even when an endpoint returns a single object, a list, or paginated results.
        </P>
        <Snippet code={successEnvelope} lang="json" filename="200 OK" />
        <P>
          Errors return an <Code>error</Code> object with a machine-readable <Code>code</Code>, a
          human <Code>message</Code>, and optional <Code>details</Code> (for example, per-field Zod
          validation issues).
        </P>
        <Snippet code={errorEnvelope} lang="json" filename="400 Bad Request" />
        <Callout variant="tip" title="Always branch on the envelope, not the HTTP status alone">
          Check for the presence of <Code>error</Code> and read <Code>error.code</Code> — the codes
          are stable across releases, while messages may be reworded. The full list is in the{' '}
          <a href="#error-codes" className="text-primary underline-offset-4 hover:underline">
            Error Reference
          </a>
          .
        </Callout>
      </SubSection>
    </SectionShell>
  );
}
