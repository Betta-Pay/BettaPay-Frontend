import { retryWithBackoff } from '../retry';

describe('retryWithBackoff', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('does not start an attempt when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = jest.fn().mockResolvedValue('done');

    await expect(retryWithBackoff(fn, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('rejects immediately when aborted during a pending attempt', async () => {
    const controller = new AbortController();
    let resolveAttempt!: (value: string) => void;
    const fn = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveAttempt = resolve;
        }),
    );
    const retry = retryWithBackoff(fn, { signal: controller.signal });

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    await expect(retry).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).toHaveBeenCalledTimes(1);
    resolveAttempt('late result');
  });

  it('cancels the backoff delay and does not start another attempt', async () => {
    const controller = new AbortController();
    const fn = jest.fn().mockRejectedValue(new Error('temporary failure'));
    const retry = retryWithBackoff(fn, {
      baseDelay: 60_000,
      signal: controller.signal,
      isRetryable: () => true,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    await expect(retry).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
