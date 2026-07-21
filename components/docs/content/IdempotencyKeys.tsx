import { SectionShell, SubSection, P, Code, Ul, Callout } from './primitives';
import { Snippet } from './Snippet';

const safeRetry = `import crypto from 'node:crypto';

async function createPaymentSafely(body, token) {
  // Generate the key ONCE, outside the retry loop, so every attempt
  // of this logical operation carries the same key.
  const idempotencyKey = crypto.randomUUID();

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://bettapay-backend.onrender.com/api/payments', {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${token}\`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),   // identical body on every attempt
    });

    if (res.ok) return (await res.json()).data;

    // Only transient failures are worth retrying.
    if (![408, 429, 500, 502, 503, 504].includes(res.status)) {
      throw new Error(\`Create failed: \${res.status}\`);
    }

    const backoff = 2 ** attempt * 250 + Math.random() * 250; // jitter
    await new Promise((r) => setTimeout(r, backoff));
  }

  throw new Error('Create payment: retries exhausted');
}`;

/** Guide: "Idempotency Keys". */
export function IdempotencyKeys() {
  return (
    <SectionShell
      id="idempotency-keys"
      title="Idempotency Keys"
      lead="An idempotency key makes a create request safe to retry. Without one, a dropped response can turn a single checkout into two charges."
    >
      <SubSection id="idempotency-how" title="How they work">
        <P>
          Send an <Code>Idempotency-Key</Code> header on <Code>POST /api/payments</Code>. The gateway
          stores the key alongside the result of the first successful request. Any later request
          with the same key returns that original result instead of creating a new payment.
        </P>
        <Ul>
          <li>
            <span className="font-medium text-foreground">Scope:</span> payment creation. Reads are
            naturally idempotent and need no key.
          </li>
          <li>
            <span className="font-medium text-foreground">Retention:</span> keys are remembered for{' '}
            <span className="font-medium text-foreground">24 hours</span>, then expire.
          </li>
          <li>
            <span className="font-medium text-foreground">Length:</span> up to{' '}
            <span className="font-medium text-foreground">255 characters</span>.
          </li>
          <li>
            <span className="font-medium text-foreground">Format:</span> any unique string — a UUID
            v4 is the safest default.
          </li>
        </Ul>
      </SubSection>

      <SubSection id="idempotency-conflicts" title="Conflicts">
        <P>
          Reusing a key with a <em>different</em> body returns <Code>409 IDEMPOTENCY_CONFLICT</Code>.
          That is a guard, not a bug: it means two different operations were given the same identity.
        </P>
        <Callout variant="warning" title="Generate the key per operation, not per attempt">
          Create the key once for a logical operation and reuse it across retries. Generating a new
          key inside the retry loop defeats the entire mechanism — each retry becomes a new payment.
        </Callout>
      </SubSection>

      <SubSection id="idempotency-example" title="Safe retry pattern">
        <P>
          The key is generated once, the body never changes between attempts, and only transient
          statuses are retried with exponential backoff plus jitter.
        </P>
        <Snippet code={safeRetry} lang="javascript" filename="create-payment.js" />
        <P>
          For the full list of which statuses are safe to retry, see{' '}
          <a href="#error-codes" className="text-primary underline-offset-4 hover:underline">
            Error Codes
          </a>
          .
        </P>
      </SubSection>
    </SectionShell>
  );
}
