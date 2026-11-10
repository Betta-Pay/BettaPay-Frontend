/**
 * Soroban XDR decoding (issue #793): a transaction's invokeHostFunction
 * operation should decode into a readable contract id / function name / args
 * shape, and anything that isn't a Soroban contract invocation (an ordinary
 * payment, or unparseable XDR) should decode to `null` rather than throw.
 *
 * Runs in the node environment: @stellar/stellar-sdk's key generation passes
 * the npm `buffer` package's Buffer into @noble/ed25519, whose Bytes check
 * rejects Buffers from the jsdom realm ("expected Uint8Array ... got
 * type=object"). This suite has no DOM dependencies.
 *
 * @jest-environment node
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
import {
  decodeSorobanInvocation,
  fetchTransactionEnvelope,
  simulateSorobanTransaction,
  SorobanSimulationError,
} from '../sorobanInvocation';

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
      nativeToScVal(BigInt(1000), { type: 'i128' }),
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
    expect(decoded?.args[1]).toBe(BigInt(1000));
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

describe('simulateSorobanTransaction (#898)', () => {
  it('calculates required resource fees and footprint limits from RPC simulation', async () => {
    const { envelopeXdr } = buildInvokeContractEnvelope();
    const tx = TransactionBuilder.fromXDR(envelopeXdr, Networks.TESTNET);

    const mockServer = {
      simulateTransaction: jest.fn().mockResolvedValue({
        minResourceFee: '48000',
        cost: {
          cpuInsns: '1250000',
          memBytes: '262144',
        },
        resources: {
          readBytes: 2048,
          writeBytes: 512,
        },
        transactionData: 'AAAA-mock-soroban-data',
      }),
    };

    const result = await simulateSorobanTransaction(tx, mockServer, {
      baseFeeStroops: 100,
      feeBufferBps: 1500, // +15%
    });

    expect(mockServer.simulateTransaction).toHaveBeenCalledWith(tx);
    expect(result.minResourceFee).toBe('48000');
    // 100 + ceil(48000 * 1.15) = 55300
    expect(result.totalFeeStroops).toBe('55300');
    expect(result.footprint).toEqual({
      cpuInstructions: 1250000,
      memoryBytes: 262144,
      readBytes: 2048,
      writeBytes: 512,
    });
    expect(result.transactionData).toBe('AAAA-mock-soroban-data');
  });

  it('throws descriptive SorobanSimulationError before user signs when simulation fails', async () => {
    const { envelopeXdr } = buildInvokeContractEnvelope();
    const tx = TransactionBuilder.fromXDR(envelopeXdr, Networks.TESTNET);

    const mockServer = {
      simulateTransaction: jest.fn().mockResolvedValue({
        error: 'HostError: Error(Contract, #4) — insufficient allowance',
        events: ['diag-event-1'],
      }),
    };

    const err = await simulateSorobanTransaction(tx, mockServer).catch((e) => e);
    expect(err).toBeInstanceOf(SorobanSimulationError);
    expect((err as SorobanSimulationError).message).toContain('insufficient allowance');
    expect((err as SorobanSimulationError).details).toContain('HostError');
    expect((err as SorobanSimulationError).events).toEqual(['diag-event-1']);
  });
});
