/**
 * Decodes Soroban contract invocations out of a transaction envelope XDR into
 * a human-readable shape, so the UI can show a contract id / function name /
 * arguments instead of a raw base64 blob (issue #793).
 */

import { Address, Operation, TransactionBuilder, scValToNative } from '@stellar/stellar-sdk';
import { getHorizonUrl, getNetworkPassphrase, type StellarNetwork } from './config';

export interface SorobanInvocation {
  contractId: string;
  functionName: string;
  args: unknown[];
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

function isInvokeHostFunctionOp(op: Operation): op is Operation.InvokeHostFunction {
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
