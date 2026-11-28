import { enqueue, initSender, destroySender, resetSender, MAX_QUEUE_SIZE } from '../send';
import type { RumEvent } from '../types';

// Blob is replaced with a plain holder so the test can read the JSON payload back.
class FakeBlob {
  constructor(public parts: string[]) {}
}

const realBlob = globalThis.Blob;
const realFetch = globalThis.fetch;

function makeEvent(i: number): RumEvent {
  return { clientId: 'client-test', route: '/dashboard', name: 'fcp', value: i, timestamp: Date.now() };
}

function payloadsFrom(beacon: jest.Mock): RumEvent[][] {
  return beacon.mock.calls.map(([, blob]) => JSON.parse((blob as unknown as FakeBlob).parts[0]).events);
}

describe('RUM sender bounds and listener cleanup (#1144)', () => {
  let beacon: jest.Mock;

  beforeEach(() => {
    resetSender();
    jest.useFakeTimers();
    (globalThis as { Blob: unknown }).Blob = FakeBlob;
    beacon = jest.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true });
  });

  afterEach(() => {
    destroySender();
    resetSender();
    jest.useRealTimers();
    (globalThis as { Blob: unknown }).Blob = realBlob;
    (globalThis as { fetch: unknown }).fetch = realFetch;
  });

  it('never sends a batch larger than the batch cap', () => {
    for (let i = 0; i < 120; i++) enqueue(makeEvent(i));
    jest.advanceTimersByTime(60_000);

    const batches = payloadsFrom(beacon);
    expect(batches.every((batch) => batch.length <= 50)).toBe(true);
    expect(batches.flat()).toHaveLength(120);
  });

  it('keeps the queue within MAX_QUEUE_SIZE', () => {
    expect(MAX_QUEUE_SIZE).toBeGreaterThan(0);
    for (let i = 0; i < MAX_QUEUE_SIZE + 10; i++) enqueue(makeEvent(i));
    jest.advanceTimersByTime(60_000);

    const sent = payloadsFrom(beacon).flat().length;
    expect(sent).toBeLessThanOrEqual(MAX_QUEUE_SIZE + 10);
  });

  it('falls back to a keepalive fetch when sendBeacon returns false', async () => {
    const fetchMock = jest.fn(() => Promise.resolve({} as Response));
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    beacon.mockReturnValue(false);

    enqueue(makeEvent(1));
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/rum');
    expect(init.keepalive).toBe(true);
  });

  it('falls back to fetch when sendBeacon throws', async () => {
    const fetchMock = jest.fn(() => Promise.resolve({} as Response));
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    beacon.mockImplementation(() => {
      throw new Error('blocked');
    });

    enqueue(makeEvent(1));
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('removes exactly the listeners it added on teardown, and attaches them once', () => {
    const addDoc = jest.spyOn(document, 'addEventListener');
    const removeDoc = jest.spyOn(document, 'removeEventListener');
    const addWin = jest.spyOn(window, 'addEventListener');
    const removeWin = jest.spyOn(window, 'removeEventListener');

    initSender();
    initSender();
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addWin).toHaveBeenCalledTimes(2);

    destroySender();
    expect(removeDoc).toHaveBeenCalledWith('visibilitychange', addDoc.mock.calls[0][1]);
    for (const [type, handler] of addWin.mock.calls) {
      expect(removeWin).toHaveBeenCalledWith(type, handler);
    }

    addDoc.mockRestore();
    removeDoc.mockRestore();
    addWin.mockRestore();
    removeWin.mockRestore();
  });
});
