import { SectionShell, SubSection, P, Code, Ol, Callout } from './primitives';
import { Snippet } from './Snippet';

const friendbot = `# Fund a brand-new testnet account with test XLM (for fees)
curl "https://friendbot.stellar.org?addr=$STELLAR_ADDRESS"`;

const trustline = `import {
  Horizon, TransactionBuilder, Operation, Asset, Networks,
} from '@stellar/stellar-sdk';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');

// Test USDC on testnet is issued by a test issuer account.
const USDC = new Asset('USDC', process.env.TESTNET_USDC_ISSUER);

const account = await server.loadAccount(address);
const tx = new TransactionBuilder(account, {
  fee: await server.fetchBaseFee().then(String),
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.changeTrust({ asset: USDC }))
  .setTimeout(60)
  .build();

// Sign with Freighter, then submit
const signedXdr = await signTransaction(tx.toXDR(), {
  networkPassphrase: Networks.TESTNET,
});
await server.submitTransaction(
  TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET),
);`;

const verifyHorizon = `# Look up the settling transaction returned on the payment
curl "https://horizon-testnet.stellar.org/transactions/$TX_HASH"

# Inspect the individual payment operations it contains
curl "https://horizon-testnet.stellar.org/transactions/$TX_HASH/operations"`;

/** Guide: "Testing with Testnet". */
export function TestingTestnet() {
  return (
    <SectionShell
      id="testing-testnet"
      title="Testing with Testnet"
      lead="Run the entire payment flow against Stellar Testnet with free test assets before you touch real funds."
    >
      <SubSection id="testnet-freighter" title="1. Point Freighter at Testnet">
        <Ol>
          <li>
            Install the{' '}
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Freighter
            </a>{' '}
            browser extension and create or import an account.
          </li>
          <li>
            Open Freighter → <span className="font-medium text-foreground">Settings → Network</span>{' '}
            and switch to <Code>Test Net</Code>.
          </li>
          <li>
            Make sure your app is configured for testnet too, so the network passphrase you sign with
            matches (<Code>Test SDF Network ; September 2015</Code>).
          </li>
        </Ol>
        <Callout variant="warning" title="Network mismatch is the most common testnet bug">
          If the wallet is on Testnet and the app expects Mainnet (or vice versa), signatures verify
          against the wrong passphrase and auth fails with a confusing error. Keep both on Testnet.
        </Callout>
      </SubSection>

      <SubSection id="testnet-funding" title="2. Fund the account and get test USDC">
        <P>
          Friendbot funds any new testnet account with test XLM so it can pay transaction fees:
        </P>
        <Snippet code={friendbot} lang="bash" filename="Terminal" />
        <P>
          To hold test USDC the account needs a trustline to the test issuer, after which the issuer
          (or a testnet faucet) can send you a balance:
        </P>
        <Snippet code={trustline} lang="typescript" filename="add-trustline.ts" />
      </SubSection>

      <SubSection id="testnet-payment" title="3. Create a test payment">
        <P>
          Authenticate as usual (wallet auth signs with the same testnet passphrase), then create a
          payment exactly as you would in production — see{' '}
          <a href="#quickstart" className="text-primary underline-offset-4 hover:underline">
            Quickstart
          </a>
          . Open the returned <Code>url</Code> and pay it from your Freighter testnet account.
        </P>
      </SubSection>

      <SubSection id="testnet-verify" title="4. Verify on Horizon">
        <P>
          Once the payment reports <Code>completed</Code>, it carries a <Code>txHash</Code>. Confirm
          it independently against the public testnet Horizon instance:
        </P>
        <Snippet code={verifyHorizon} lang="bash" filename="Terminal" />
        <P>
          The operations response shows the USDC transfer, its amount, and the source and
          destination accounts — the ground truth behind the payment record.
        </P>
        <Callout variant="tip" title="Testnet is periodically reset">
          Stellar Testnet data is wiped from time to time. Treat testnet accounts, balances and
          history as disposable, and never reuse a testnet key on Mainnet.
        </Callout>
      </SubSection>
    </SectionShell>
  );
}
