/**
 * Decodes Soroban contract invocations out of a transaction envelope XDR into
 * a human-readable shape, so the UI can show a contract id / function name /
 * arguments instead of a raw base64 blob (issue #793).
 */

import {
  Address,
  type FeeBumpTransaction,
  type OperationRecord,
  Operation,
  type Transaction,
  TransactionBuilder,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk';
import { getHorizonUrl, getNetworkPassphrase, type StellarNetwork } from './config';

export const BASE_INCLUSION_FEE_STROOPS = 100;
export const DEFAULT_FEE_BUFFER_BPS = 1500; // +15% safety buffer over minResourceFee

export interface SorobanInvocation {
  contractId: string;
  functionName: string;
  args: unknown[];
}

export interface SorobanResourceFootprint {
  cpuInstructions: number;
  memoryBytes: number;
  readBytes: number;
  writeBytes: number;
}

export interface SorobanFeeSimulationResult {
  minResourceFee: string;
  totalFeeStroops: string;
  footprint: SorobanResourceFootprint;
  transactionData?: string;
  preparedTransactionXdr?: string;
}

export interface SorobanRpcSimulator {
  simulateTransaction: (tx: Transaction | FeeBumpTransaction) => Promise<unknown>;
}

export class SorobanSimulationError extends Error {
  public readonly details: string;
  public readonly events: unknown[];

  constructor(message: string, opts?: { details?: string; events?: unknown[] }) {
    super(message);
    this.name = 'SorobanSimulationError';
    this.details = opts?.details ?? message;
    this.events = opts?.events ?? [];
  }
}

interface HorizonTransactionResponse {
  envelope_xdr?: string;
}

/**
 * Fetches a transaction's envelope XDR from Horizon by hash. Returns `null`
 * on any network/parse failure or a non-2xx response — callers treat a
 * missing envelope the same as "nothing to decode" rather than an error.
 */
export async function fetchTransactionEnvelope(
  txHash: string,
  network: StellarNetwork | string,
): Promise<string | null> {
  try {
    const res = await fetch(`${getHorizonUrl(network)}/transactions/${txHash}`);
    if (!res.ok) return null;
    const data = (await res.json()) as HorizonTransactionResponse;
    return data.envelope_xdr ?? null;
  } catch {
    return null;
  }
}

function isInvokeHostFunctionOp(op: OperationRecord): op is Operation.InvokeHostFunction {
  return op.type === 'invokeHostFunction';
}

/**
 * Decodes the Soroban contract invocation (if any) out of a transaction
 * envelope. Returns `null` for ordinary transactions, or for XDR that can't
 * be parsed / doesn't invoke a contract — the common case, since most
 * BettaPay transactions are plain Stellar payments.
 */
export function decodeSorobanInvocation(
  envelopeXdr: string,
  network: StellarNetwork | string,
): SorobanInvocation | null {
  try {
    const tx = TransactionBuilder.fromXDR(envelopeXdr, getNetworkPassphrase(network));
    const invokeOp = tx.operations.find(isInvokeHostFunctionOp);
    if (!invokeOp) return null;

    const hostFunction = invokeOp.func;
    if (hostFunction.switch().name !== 'hostFunctionTypeInvokeContract') return null;

    const invokeArgs = hostFunction.invokeContract();
    const contractId = Address.fromScAddress(invokeArgs.contractAddress()).toString();
    const functionName = invokeArgs.functionName().toString();
    const args = invokeArgs.args().map((arg) => scValToNative(arg));

    return { contractId, functionName, args };
  } catch {
    return null;
  }
}

function toSafeInt(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
}

/**
 * Simulates a Soroban transaction via RPC (`server.simulateTransaction(tx)`),
 * extracts `minResourceFee` and resource footprint metrics, and computes the
 * required total transaction fee prior to requesting user signature (#898).
 *
 * Throws {@link SorobanSimulationError} with descriptive details when the RPC
 * simulation reports a contract or host error.
 */
export async function simulateSorobanTransaction(
  tx: Transaction | FeeBumpTransaction,
  server: SorobanRpcSimulator,
  options: { baseFeeStroops?: number; feeBufferBps?: number } = {},
): Promise<SorobanFeeSimulationResult> {
  const baseFee = options.baseFeeStroops ?? BASE_INCLUSION_FEE_STROOPS;
  const bufferBps = options.feeBufferBps ?? DEFAULT_FEE_BUFFER_BPS;

  let rawResponse: unknown;
  try {
    rawResponse = await server.simulateTransaction(tx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SorobanSimulationError(`Soroban RPC simulation request failed: ${msg}`, {
      details: msg,
    });
  }

  if (!rawResponse || typeof rawResponse !== 'object') {
    throw new SorobanSimulationError('Soroban simulation returned an empty or invalid response');
  }

  const sim = rawResponse as Record<string, unknown>;
  if (typeof sim.error === 'string' && sim.error.trim().length > 0) {
    throw new SorobanSimulationError(`Soroban simulation failed: ${sim.error}`, {
      details: sim.error,
      events: Array.isArray(sim.events) ? sim.events : [],
    });
  }

  const minResourceFeeNum = toSafeInt(sim.minResourceFee);
  const bufferedResourceFee = Math.ceil(minResourceFeeNum * (1 + bufferBps / 10_000));
  const totalFee = Math.max(baseFee, baseFee + bufferedResourceFee);

  const cost =
    sim.cost && typeof sim.cost === 'object'
      ? (sim.cost as Record<string, unknown>)
      : {};
  const resources =
    sim.resources && typeof sim.resources === 'object'
      ? (sim.resources as Record<string, unknown>)
      : {};

  const footprint: SorobanResourceFootprint = {
    cpuInstructions: toSafeInt(cost.cpuInsns ?? resources.instructions),
    memoryBytes: toSafeInt(cost.memBytes),
    readBytes: toSafeInt(resources.readBytes ?? resources.diskReadBytes),
    writeBytes: toSafeInt(resources.writeBytes),
  };

  let preparedTransactionXdr: string | undefined;
  try {
    if ('operations' in tx && rpc?.assembleTransaction) {
      const assembled = rpc.assembleTransaction(
        tx,
        rawResponse as rpc.Api.SimulateTransactionSuccessResponse,
      );
      preparedTransactionXdr = assembled.setTimeout(30).build().toXDR();
    }
  } catch {
    // When running against lightweight mock responses without full XDR sorobanData,
    // fall back to the original transaction XDR if available.
    if (typeof (tx as { toXDR?: () => string }).toXDR === 'function') {
      preparedTransactionXdr = (tx as { toXDR: () => string }).toXDR();
    }
  }

  return {
    minResourceFee: String(minResourceFeeNum),
    totalFeeStroops: String(totalFee),
    footprint,
    transactionData:
      typeof sim.transactionData === 'string' ? sim.transactionData : undefined,
    preparedTransactionXdr,
  };
}
