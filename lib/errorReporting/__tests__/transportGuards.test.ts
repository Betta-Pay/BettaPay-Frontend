import { enqueue, flush, destroySender, isErrorsEndpointFailure } from '../send';
import type { ErrorReport } from '../types';

class FakeBlob {
  constructor(public parts: string[]) {}
}

const realBlob = globalThis.Blob;

function report(overrides: Partial<ErrorReport> = {}): ErrorReport {
  return {
    clientId: 'client-test',
    fingerprint: Math.random().toString(36).slice(2),
    source: 'manual',
    name: 'Error',
    message: 'boom',
    count: 1,
    context: {} as ErrorReport['context'],
    timestamp: Date.now(),
    ...overrides,
  };
}

function sentReports(beacon: jest.Mock): ErrorReport[][] {
  return beacon.mock.calls.map(
    ([, blob]) => JSON.parse((blob as unknown as FakeBlob).parts[0]).errors as ErrorReport[],
  );
}

describe('error transport guards (#1145)', () => {
  let beacon: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as { Blob: unknown }).Blob = FakeBlob;
    beacon = jest.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true });
  });

  afterEach(() => {
    destroySender();
    jest.useRealTimers();
    (globalThis as { Blob: unknown }).Blob = realBlob;
  });

  it('recognises failures of /api/errors itself', () => {
    expect(
      isErrorsEndpointFailure(report({ source: 'api', message: 'API http_500: POST /api/errors -> 500' })),
    ).toBe(true);
    expect(
      isErrorsEndpointFailure(report({ source: 'api', message: 'API network: GET /api/errors?x=1 -> no response' })),
    ).toBe(true);
  });

  it('does not treat other endpoints or sources as the errors endpoint', () => {
    expect(isErrorsEndpointFailure(report({ source: 'api', message: 'API http_500: GET /api/errorsfoo -> 500' }))).toBe(
      false,
    );
    expect(isErrorsEndpointFailure(report({ source: 'api', message: 'API http_500: GET /api/rum -> 500' }))).toBe(false);
    expect(isErrorsEndpointFailure(report({ source: 'manual', message: '/api/errors' }))).toBe(false);
  });

  it('never queues a report about /api/errors, so it cannot be posted again', () => {
    enqueue(report({ source: 'api', message: 'API http_500: POST /api/errors -> 500' }));
    flush();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('still sends ordinary reports', () => {
    enqueue(report({ message: 'render crashed' }));
    flush();
    expect(sentReports(beacon).flat().map((r) => r.message)).toEqual(['render crashed']);
  });

  it('never sends a batch larger than 20 reports', () => {
    for (let i = 0; i < 45; i++) enqueue(report({ message: `error ${i}` }));
    jest.advanceTimersByTime(60_000);

    const batches = sentReports(beacon);
    expect(batches.every((batch) => batch.length <= 20)).toBe(true);
    expect(batches.flat()).toHaveLength(45);
  });
});
