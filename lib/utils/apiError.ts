import { AxiosError } from 'axios';

export const REQUEST_TIMED_OUT_CODE = 'ECONNABORTED';
export const REQUEST_TIMED_OUT_MESSAGE = 'The request timed out. Please try again.';

export const NETWORK_ERROR_CODE = 'ERR_NETWORK';
export const NETWORK_ERROR_MESSAGE = "You're offline. Please check your connection.";

export const SERVER_ERROR_CODE = 'SERVER_ERROR';
export const SERVER_ERROR_MESSAGE = 'A server error occurred. Please try again later.';

export const DEFAULT_HORIZON_ERROR_MESSAGE =
  'Transaction failed on the Stellar network. Please review the details and try again.';

/**
 * Dictionary mapping Stellar Horizon transaction (`tx_*`) and operation (`op_*`)
 * result codes to friendly user-facing error descriptions.
 */
export const HORIZON_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  op_underfunded: 'Insufficient funds in wallet for this payment',
  op_no_trust: 'Trustline required for this asset before receiving funds',
  op_no_destination: 'Destination Stellar account does not exist or is not funded',
  op_line_full: 'Recipient account has reached the trustline limit for this asset',
  op_not_authorized: 'Account is not authorized to hold or transact this asset',
  op_low_reserve: 'Account balance is too low to meet the Stellar base reserve requirement',
  op_under_dest_min: 'Exchange rate changed and the minimum destination amount could not be met',
  op_over_source_max: 'Exchange rate changed and required more than the maximum source amount',
  tx_bad_auth: 'Invalid transaction signature or unauthorized signer',
  tx_bad_seq: 'Transaction sequence number is out of sync. Please refresh and try again',
  tx_insufficient_balance: 'Account balance is insufficient to cover network fees and reserves',
  tx_insufficient_fee: 'Network fee is too low for current Stellar ledger congestion',
  tx_too_late: 'Transaction expired before it could be included in a ledger',
  tx_no_source_account: 'Source Stellar account was not found on the network',
};

/**
 * Maps a Stellar Horizon result code (e.g., `op_underfunded`, `tx_bad_auth`)
 * to a friendly localized message, falling back to `fallback` when unrecognized.
 */
export function mapHorizonErrorCode(
  code: string | undefined | null,
  fallback = DEFAULT_HORIZON_ERROR_MESSAGE,
): string {
  if (!code || typeof code !== 'string') return fallback;
  const normalized = code.trim().toLowerCase();
  return HORIZON_ERROR_MESSAGES[normalized] ?? fallback;
}

interface HorizonExtrasShape {
  extras?: {
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
  };
  result_codes?: {
    transaction?: string;
    operations?: string[];
  };
  code?: string;
  message?: string;
}

/**
 * Extracts the most specific Stellar Horizon result code from a Horizon error
 * payload or Error object. Operation-level codes (`op_*` other than `op_success`)
 * take precedence over the generic `tx_failed` wrapper code.
 */
export function extractHorizonErrorCode(error: unknown): string | undefined {
  if (!error) return undefined;

  if (typeof error === 'string') {
    const trimmed = error.trim().toLowerCase();
    if (trimmed in HORIZON_ERROR_MESSAGES) return trimmed;
    const match = trimmed.match(/\b((?:op|tx)_[a-z_]+)\b/);
    if (match && match[1] in HORIZON_ERROR_MESSAGES) return match[1];
    return undefined;
  }

  if (typeof error !== 'object') return undefined;

  const maybeAxios = error as { response?: { data?: unknown } };
  const payload = (maybeAxios.response?.data ?? error) as HorizonExtrasShape;

  const resultCodes = payload?.extras?.result_codes ?? payload?.result_codes;
  if (resultCodes) {
    const opCodes = Array.isArray(resultCodes.operations) ? resultCodes.operations : [];
    const failedOp = opCodes.find((c) => typeof c === 'string' && c !== 'op_success');
    if (failedOp && failedOp.toLowerCase() in HORIZON_ERROR_MESSAGES) {
      return failedOp.toLowerCase();
    }
    if (
      typeof resultCodes.transaction === 'string' &&
      resultCodes.transaction.toLowerCase() in HORIZON_ERROR_MESSAGES
    ) {
      return resultCodes.transaction.toLowerCase();
    }
    if (failedOp) return failedOp.toLowerCase();
    if (typeof resultCodes.transaction === 'string') return resultCodes.transaction.toLowerCase();
  }

  if (typeof payload?.code === 'string' && payload.code.toLowerCase() in HORIZON_ERROR_MESSAGES) {
    return payload.code.toLowerCase();
  }

  const rawMessage =
    typeof payload?.message === 'string'
      ? payload.message
      : error instanceof Error
        ? error.message
        : undefined;
  if (rawMessage) {
    const match = rawMessage.toLowerCase().match(/\b((?:op|tx)_[a-z_]+)\b/);
    if (match && match[1] in HORIZON_ERROR_MESSAGES) {
      return match[1];
    }
  }

  return undefined;
}

export function isTimeoutError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code?: string }).code === REQUEST_TIMED_OUT_CODE;
  }
  return false;
}

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('isAxiosError' in error) {
    const axiosError = error as AxiosError;
    // No response + ERR_NETWORK or status 0 indicates network/infrastructure failure
    if (!axiosError.response) {
      if (axiosError.code === NETWORK_ERROR_CODE) return true;
      if (axiosError.code === 'ERR_NETWORK') return true;
      if ((axiosError.response as unknown as { status?: number })?.status === 0) return true;
      if (axiosError.message === 'Network Error') return true;
      // Fallback: no response and no code but message mentions network is still offline
      if (!axiosError.code && axiosError.message?.toLowerCase().includes('network')) return true;
    }
    return false;
  }
  if ('code' in error) {
    const code = (error as { code?: string }).code;
    if (code === NETWORK_ERROR_CODE || code === 'ERR_NETWORK') return true;
  }
  // Generic Error that mentions network and has status 0
  if (error instanceof Error && error.message?.toLowerCase().includes('network')) {
    const maybeStatus = (error as unknown as { status?: number }).status;
    if (maybeStatus === 0 || maybeStatus === undefined) return true;
  }
  return false;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  status?: number;
  details?: unknown;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    code: string,
    status?: number,
    details?: unknown,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

function extractFieldErrors(data: unknown): Record<string, string> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as Record<string, unknown>;
  const errors = obj.errors;

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const record = errors as Record<string, unknown>;
    const fieldErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        fieldErrors[key] = value;
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        fieldErrors[key] = value[0];
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }
  }

  return undefined;
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  // Timeout is distinct from server errors — retry-oriented messaging.
  if (isTimeoutError(error)) {
    const details = (error as { response?: { data?: { details?: unknown } } })?.response?.data?.details;
    return new ApiError(REQUEST_TIMED_OUT_MESSAGE, REQUEST_TIMED_OUT_CODE, undefined, details);
  }

  // Network / infra errors (status 0 / ERR_NETWORK) must not surface as "server error".
  if (isNetworkError(error)) {
    const axiosError = error as AxiosError<{ message?: string; details?: unknown }>;
    const details = axiosError.response?.data?.details;
    // Carry the network code through so toasts can differentiate offline vs server.
    const code = (axiosError as unknown as { code?: string })?.code || NETWORK_ERROR_CODE;
    return new ApiError(NETWORK_ERROR_MESSAGE, code, 0, details);
  }

  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; code?: string; details?: unknown }>;
    const data = axiosError.response?.data;
    const status = axiosError.response?.status;

    // Separate timeout from 5xx: timeout already handled above, but double-check code here
    if (axiosError.code === REQUEST_TIMED_OUT_CODE) {
      const fieldErrors = extractFieldErrors(data);
      return new ApiError(REQUEST_TIMED_OUT_MESSAGE, REQUEST_TIMED_OUT_CODE, status, data?.details, fieldErrors);
    }

    // 5xx server errors get their own copy, distinct from timeout/network
    if (status !== undefined && status >= 500) {
      const message = data?.message || data?.error || SERVER_ERROR_MESSAGE;
      const code = data?.code || axiosError.code || `${SERVER_ERROR_CODE}_${status}`;
      const details = data?.details;
      const fieldErrors = extractFieldErrors(data);
      return new ApiError(message, code, status, details, fieldErrors);
    }

    // Generic / client errors (4xx, etc.)
    const horizonCode = extractHorizonErrorCode(error);
    if (horizonCode && horizonCode in HORIZON_ERROR_MESSAGES) {
      const details = data?.details;
      const fieldErrors = extractFieldErrors(data);
      return new ApiError(
        mapHorizonErrorCode(horizonCode),
        horizonCode,
        status,
        details,
        fieldErrors,
      );
    }

    const message = data?.message || data?.error || axiosError.message || 'An unexpected error occurred';
    const code = data?.code || axiosError.code || 'UNKNOWN_ERROR';
    const details = data?.details;
    const fieldErrors = extractFieldErrors(data);

    return new ApiError(message, code, status, details, fieldErrors);
  }

  const directHorizonCode = extractHorizonErrorCode(error);
  if (directHorizonCode && directHorizonCode in HORIZON_ERROR_MESSAGES) {
    return new ApiError(mapHorizonErrorCode(directHorizonCode), directHorizonCode);
  }

  if (error instanceof Error) {
    const maybeCode = (error as unknown as { code?: string }).code;
    // Handle bare Error that wraps a network failure (e.g., thrown by fetch)
    if (maybeCode === NETWORK_ERROR_CODE || maybeCode === 'ERR_NETWORK' || error.message === 'Network Error') {
      return new ApiError(NETWORK_ERROR_MESSAGE, NETWORK_ERROR_CODE, 0);
    }
    if (maybeCode === REQUEST_TIMED_OUT_CODE) {
      return new ApiError(REQUEST_TIMED_OUT_MESSAGE, REQUEST_TIMED_OUT_CODE);
    }
    // Preserve code if present, otherwise UNKNOWN_ERROR — ensures code flows to toasts.
    return new ApiError(error.message, maybeCode || 'UNKNOWN_ERROR');
  }

  return new ApiError('An unexpected error occurred', 'UNKNOWN_ERROR');
}

export function getErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}
