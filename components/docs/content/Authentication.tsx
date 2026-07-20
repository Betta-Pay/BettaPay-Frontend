import { authEndpoints } from '@/lib/docs/endpoints';
import type { SchemaField } from '@/lib/docs/types';
import { EndpointBlock } from '../EndpointBlock';
import { SchemaTable } from '../SchemaTable';
import { SectionShell, SubSection, P, Code, Ol, Ul, Callout } from './primitives';
import { Snippet } from './Snippet';

const byId = (id: string) => authEndpoints.find((e) => e.id === id)!;

const googleFrontend = `import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export function SignInButton() {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <GoogleLogin
        onSuccess={async ({ credential }) => {
          // Exchange the Google ID token for a BettaPay JWT
          const res = await fetch(
            'https://bettapay-backend.onrender.com/api/auth/google',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: credential }),
            },
          );
          const { token } = await res.json();
          // persist the session (see JWT Handling below)
        }}
        onError={() => console.error('Google login failed')}
      />
    </GoogleOAuthProvider>
  );
}`;

const walletFlow = `import { signMessage } from '@stellar/freighter-api';

const BASE = 'https://bettapay-backend.onrender.com';

// 1. Ask the gateway for a one-time challenge for this address
const { challenge } = await fetch(
  \`\${BASE}/api/auth/wallet/challenge?address=\${address}\`,
).then((r) => r.json());

// 2. Sign the challenge with Freighter (Ed25519)
const { signedMessage, signature } = await signMessage(challenge, { address });

// 3. Exchange the signed challenge for a BettaPay JWT
const { token } = await fetch(\`\${BASE}/api/auth/wallet/verify\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address, challenge, signature: signature ?? signedMessage }),
}).then((r) => r.json());`;

const jwtDecode = `// A BettaPay JWT is three base64url segments: header.payload.signature.
// base64url is NOT base64 — it swaps '+' '/' for '-' '_'. Feeding it straight
// to atob() corrupts any payload that happens to contain those characters.
function decodeJwt(token) {
  const segment = token.split('.')[1];
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

decodeJwt(token);
// → { merchantId: '4c1e...', ownerId: 'ops@acme.com',
//     role: 'merchant', iat: 1721300000, exp: 1721386400 }`;

const jwtPayloadFields: SchemaField[] = [
  { name: 'merchantId', type: 'string (uuid)', required: true, description: 'The merchant this token acts as. Used to scope every authenticated route.' },
  { name: 'ownerId', type: 'string', required: true, description: 'Identity of the principal that owns the merchant (email for Google, address for wallet).' },
  { name: 'role', type: "'merchant' | 'admin'", required: true, description: 'Authorization role.' },
  { name: 'iat', type: 'number (unix)', required: true, description: 'Issued-at time.' },
  { name: 'exp', type: 'number (unix)', required: true, description: 'Expiry time. Re-authenticate or refresh before this passes.' },
];

/** "Authentication" — Google OAuth, wallet auth and JWT handling. */
export function Authentication() {
  return (
    <SectionShell
      id="authentication"
      title="Authentication"
      lead="BettaPay issues a signed JWT that you attach as a Bearer token on every authenticated request. There are two ways to obtain one: Google OAuth and Stellar wallet auth."
    >
      {/* ── Google OAuth ── */}
      <SubSection id="google-oauth" title="Google OAuth">
        <P>
          <span className="font-medium text-foreground">Prerequisite:</span> create an OAuth 2.0
          Web Client in the Google Cloud console, add your origin to the authorized JavaScript
          origins, and expose the client id to the frontend as{' '}
          <Code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</Code>.
        </P>
        <P>
          On the client, render <Code>&lt;GoogleLogin /&gt;</Code> from{' '}
          <Code>@react-oauth/google</Code>. On success you receive a Google ID token
          (<Code>credential</Code>) which you POST to the gateway.
        </P>
        <Snippet code={googleFrontend} lang="tsx" filename="SignInButton.tsx" />
        <P>
          The gateway verifies the ID token with <Code>google-auth-library</Code> against your
          client id, upserts the merchant, and returns a BettaPay JWT.
        </P>
        <EndpointBlock endpoint={byId('auth-google')} />
      </SubSection>

      {/* ── Wallet Auth ── */}
      <SubSection id="wallet-auth" title="Wallet Auth">
        <P>
          Wallet auth proves ownership of a Stellar key without a password. The gateway issues a
          challenge, the wallet signs it, and the gateway verifies the Ed25519 signature with{' '}
          <Code>@stellar/stellar-sdk</Code> before issuing a JWT.
        </P>
        <Ol>
          <li>Request a challenge for the connected address.</li>
          <li>Sign the challenge string with Freighter (<Code>signMessage</Code>).</li>
          <li>POST the address, challenge and signature to verify — receive a JWT.</li>
        </Ol>
        <Snippet code={walletFlow} lang="typescript" filename="wallet-auth.ts" />
        <EndpointBlock endpoint={byId('auth-wallet-challenge')} />
        <EndpointBlock endpoint={byId('auth-wallet-verify')} />
        <Callout variant="warning" title="Challenges are single-use and short-lived">
          A challenge is bound to the address that requested it and expires quickly. Always sign the
          exact string returned by the challenge endpoint — do not reconstruct or reuse it.
        </Callout>
      </SubSection>

      {/* ── JWT Handling ── */}
      <SubSection id="jwt-handling" title="JWT Handling">
        <P>
          Both flows return the same token shape. Decode the payload to read the merchant context —
          but decode it correctly:
        </P>
        <Callout variant="warning" title="The payload is base64url, not base64">
          <code className="font-mono text-foreground">atob()</code> expects standard base64. JWT
          segments are base64url (<code className="font-mono text-foreground">-</code> and{' '}
          <code className="font-mono text-foreground">_</code> instead of{' '}
          <code className="font-mono text-foreground">+</code> and{' '}
          <code className="font-mono text-foreground">/</code>). Convert first, or the decode fails
          intermittently depending on the payload bytes.
        </Callout>
        <Snippet code={jwtDecode} lang="javascript" filename="decode-jwt.js" />
        <P>The decoded payload contains:</P>
        <SchemaTable fields={jwtPayloadFields} />
        <P>
          <span className="font-medium text-foreground">Session persistence &amp; expiry.</span>{' '}
          Keep the raw token out of <Code>localStorage</Code>. The reference frontend posts it to a
          same-origin route that sets an <Code>HttpOnly</Code>, <Code>Secure</Code> session cookie,
          so JavaScript never touches it after login. Watch <Code>exp</Code> and refresh ahead of
          time.
        </P>
        <P>
          <span className="font-medium text-foreground">Refresh flow.</span> When an authenticated
          request returns <Code>401</Code>, call your refresh endpoint once, then replay the
          original request. Concurrent 401s should queue behind a single in-flight refresh so you
          never trigger a refresh storm.
        </P>
        <Ul>
          <li>Attach <Code>Authorization: Bearer &lt;jwt&gt;</Code> to every authenticated call.</li>
          <li>On <Code>401</Code>, refresh and retry the original request exactly once.</li>
          <li>On a failed refresh, clear the session and send the user back to sign-in.</li>
        </Ul>
      </SubSection>
    </SectionShell>
  );
}
