/**
 * Soroban XDR decoding (issue #793): a transaction's invokeHostFunction
 * operation should decode into a readable contract id / function name / args
 * shape, and anything that isn't a Soroban contract invocation (an ordinary
 * payment, or unparseable XDR) should decode to `null` rather than throw.
 */
import {
  Account,
  Address,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { decodeSorobanInvocation, fetchTransactionEnvelope } from '../sorobanInvocation';

function buildInvokeContractEnvelope(): { envelopeXdr: string; contractId: string; recipient: string } {
  const sourceKeypair = Keypair.random();
  const source = new Account(sourceKeypair.publicKey(), '0');
  const contractId = Address.contract(Buffer.alloc(32, 1)).toString();
  const recipient = Keypair.random().publicKey();

  const op = Operation.invokeContractFunction({
    contract: contractId,
    function: 'transfer',
    args: [
      nativeToScVal(recipient, { type: 'address' }),
      nativeToScVal(1000n, { type: 'i128' }),
    ],
  });

  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(op)
    .setTimeout(30)
    .build();

  return { envelopeXdr: tx.toXDR(), contractId, recipient };
}

function buildPaymentEnvelope(): string {
  const sourceKeypair = Keypair.random();
  const source = new Account(sourceKeypair.publicKey(), '0');
  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(
      Operation.payment({
        destination: Keypair.random().publicKey(),
        asset: Asset.native(),
        amount: '10',
      }),
    )
    .setTimeout(30)
    .build();
  return tx.toXDR();
}

describe('decodeSorobanInvocation', () => {
  it('decodes a Soroban invokeHostFunction transaction into contract id, function name, and args', () => {
    const { envelopeXdr, contractId, recipient } = buildInvokeContractEnvelope();

    const decoded = decodeSorobanInvocation(envelopeXdr, 'testnet');

    expect(decoded).not.toBeNull();
    expect(decoded?.contractId).toBe(contractId);
    expect(decoded?.functionName).toBe('transfer');
    expect(decoded?.args).toHaveLength(2);
    expect(decoded?.args[0]).toBe(recipient);
    expect(decoded?.args[1]).toBe(1000n);
  });

  it('returns null for an ordinary (non-Soroban) payment transaction', () => {
    const decoded = decodeSorobanInvocation(buildPaymentEnvelope(), 'testnet');
    expect(decoded).toBeNull();
  });

  it('returns null instead of throwing for unparseable XDR', () => {
    expect(decodeSorobanInvocation('not-valid-xdr', 'testnet')).toBeNull();
  });
});

describe('fetchTransactionEnvelope', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the envelope_xdr from a successful Horizon response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ envelope_xdr: 'AAAA...' }),
    }) as unknown as typeof fetch;

    await expect(fetchTransactionEnvelope('hash1', 'testnet')).resolves.toBe('AAAA...');
    expect(global.fetch).toHaveBeenCalledWith('https://horizon-testnet.stellar.org/transactions/hash1');
  });

  it('returns null on a non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(fetchTransactionEnvelope('hash1', 'testnet')).resolves.toBeNull();
  });

  it('returns null when the request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(fetchTransactionEnvelope('hash1', 'testnet')).resolves.toBeNull();
  });
});
