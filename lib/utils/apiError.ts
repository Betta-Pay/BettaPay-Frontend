import { AxiosError } from 'axios';

export const REQUEST_TIMED_OUT_CODE = 'ECONNABORTED';
export const REQUEST_TIMED_OUT_MESSAGE = 'The request timed out. Please try again.';

export const NETWORK_ERROR_CODE = 'ERR_NETWORK';
export const NETWORK_ERROR_MESSAGE = "You're offline. Please check your connection.";

export const SERVER_ERROR_CODE = 'SERVER_ERROR';
export const SERVER_ERROR_MESSAGE = 'A server error occurred. Please try again later.';

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
    // A rejected XHR/fetch reports status 0 on the response *or* on the raw
    // request. Both checks run outside the `!response` guard below so the
    // status-0 signal is actually reachable — a status-0 response is itself
    // the network-failure marker, and `request.status` covers the no-response
    // case (issue #1159).
    if (axiosError.response?.status === 0) return true;
    if (axiosError.request?.status === 0) return true;
    // No response + ERR_NETWORK indicates network/infrastructure failure
    if (!axiosError.response) {
      if (axiosError.code === NETWORK_ERROR_CODE) return true;
      if (axiosError.code === 'ERR_NETWORK') return true;
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
    const message = data?.message || data?.error || axiosError.message || 'An unexpected error occurred';
    const code = data?.code || axiosError.code || 'UNKNOWN_ERROR';
    const details = data?.details;
    const fieldErrors = extractFieldErrors(data);

    return new ApiError(message, code, status, details, fieldErrors);
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
