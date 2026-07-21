import { SectionShell, SubSection, P, Code, Ol, Ul, Callout } from './primitives';
import { Snippet } from './Snippet';

const handler = `import express from 'express';
import crypto from 'node:crypto';

const app = express();
const seen = new Set(); // use Redis/DB in production

app.post(
  '/webhooks/bettapay',
  express.raw({ type: 'application/json' }),   // keep the raw bytes
  (req, res) => {
    const signature = req.header('X-BettaPay-Signature') ?? '';
    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', process.env.BETTAPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest('hex');

    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return res.status(400).send('invalid signature');
    }

    const event = JSON.parse(req.body.toString('utf8'));

    // 1. Acknowledge immediately — do slow work out of band.
    res.sendStatus(200);

    // 2. Deduplicate: the same event may be delivered more than once.
    if (seen.has(event.id)) return;
    seen.add(event.id);

    // 3. Handle it.
    switch (event.type) {
      case 'payment.completed':
        void fulfillOrder(event.data);
        break;
      case 'settlement.completed':
        void recordPayout(event.data);
        break;
      default:
        break; // ignore unknown types rather than failing
    }
  },
);`;

const tunnel = `# Expose your local handler so the gateway can reach it while developing
npx localtunnel --port 3000
# or
ngrok http 3000`;

/** Guide: "Webhook Integration". */
export function WebhookIntegration() {
  return (
    <SectionShell
      id="webhook-integration"
      title="Webhook Integration"
      lead="A practical walkthrough for receiving BettaPay events reliably: verify the signature, acknowledge fast, and make your handler idempotent."
    >
      <SubSection id="webhook-setup" title="Setting up an endpoint">
        <Ol>
          <li>
            Expose a public HTTPS route (for example <Code>POST /webhooks/bettapay</Code>) that
            accepts JSON.
          </li>
          <li>
            Register the URL with BettaPay and store the webhook secret as{' '}
            <Code>BETTAPAY_WEBHOOK_SECRET</Code> — never commit it.
          </li>
          <li>Verify every delivery&apos;s signature before acting on it.</li>
        </Ol>
        <Callout variant="warning" title="Your endpoint must be publicly reachable and unauthenticated">
          Do not put the webhook route behind your normal session auth — the gateway has no session.
          The HMAC signature <em>is</em> the authentication.
        </Callout>
      </SubSection>

      <SubSection id="webhook-handler" title="A production-ready handler">
        <P>
          The handler below verifies the signature over the raw bytes, acknowledges immediately,
          deduplicates on <Code>event.id</Code>, and ignores unknown event types so new events never
          break your integration.
        </P>
        <Snippet code={handler} lang="javascript" filename="webhooks.js" />
      </SubSection>

      <SubSection id="webhook-reliability" title="Reliability rules">
        <Ul>
          <li>
            <span className="font-medium text-foreground">Acknowledge within seconds.</span> Return{' '}
            <Code>2xx</Code> first, then process. Slow handlers get retried and duplicated.
          </li>
          <li>
            <span className="font-medium text-foreground">Be idempotent.</span> Deliveries can repeat
            — key your side effects on <Code>event.id</Code>.
          </li>
          <li>
            <span className="font-medium text-foreground">Tolerate out-of-order delivery.</span>{' '}
            Compare against the resource&apos;s current status rather than assuming sequence.
          </li>
          <li>
            <span className="font-medium text-foreground">Ignore unknown types.</span> New event
            types may be added; unknown ones should be a no-op, not a 500.
          </li>
          <li>
            <span className="font-medium text-foreground">Never trust the body before verifying.</span>{' '}
            Parse only after the HMAC check passes.
          </li>
        </Ul>
      </SubSection>

      <SubSection id="webhook-local-testing" title="Testing locally">
        <P>
          Point the gateway at a tunnel so you can iterate against your machine, then trigger a real
          event by completing a testnet payment (see{' '}
          <a href="#testing-testnet" className="text-primary underline-offset-4 hover:underline">
            Testing with Testnet
          </a>
          ).
        </P>
        <Snippet code={tunnel} lang="bash" filename="Terminal" />
        <P>
          The full event catalog and payload schema live in{' '}
          <a href="#webhook-events" className="text-primary underline-offset-4 hover:underline">
            Webhook Events
          </a>
          .
        </P>
      </SubSection>
    </SectionShell>
  );
}
