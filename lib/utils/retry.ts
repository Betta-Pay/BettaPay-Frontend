import { ApiError } from './apiError';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  signal?: AbortSignal;
  onRetry?: (error: unknown, attempt: number) => void;
  isRetryable?: (error: unknown) => boolean;
}

function abortReason(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortReason(signal);
}

async function runWithAbort<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  throwIfAborted(signal);
  if (!signal) return fn();

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortReason(signal));
    signal.addEventListener('abort', onAbort, { once: true });
  });

  try {
    return await Promise.race([fn(signal), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort);
  }
}

function waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (!signal) return new Promise((resolve) => setTimeout(resolve, delay));

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      reject(abortReason(signal));
    };
    timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const defaultIsRetryable = (error: unknown): boolean => {
  return error instanceof ApiError && (error.status ?? 0) >= 500;
};

export async function retryWithBackoff<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    signal,
    onRetry,
    isRetryable = defaultIsRetryable,
  } = options || {};

  let attempt = 0;

  while (true) {
    try {
      return await runWithAbort(fn, signal);
    } catch (error) {
      throwIfAborted(signal);
      if (!isRetryable(error)) {
        throw error;
      }

      attempt++;

      if (attempt > maxRetries) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      console.warn(
        `[retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`,
        error,
      );

      onRetry?.(error, attempt);

      await waitForRetry(delay, signal);
    }
  }
}
