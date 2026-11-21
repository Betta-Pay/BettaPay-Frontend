/** @jest-environment node */

import { GET } from '../route';

function makeToken(exp = Math.floor(Date.now() / 1000) + 3600) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'HS256' })}.${encode({ exp })}.signature`;
}

function makeRequest(signal: AbortSignal, token?: string) {
  return {
    headers: new Headers(token ? { cookie: `auth_token=${token}` } : {}),
    signal,
  } as Request;
}

describe('GET /api/notifications/stream', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([undefined, 'not-a-valid-token'])(
    'returns 401 for a missing or invalid auth token',
    async (token) => {
      const response = await GET(makeRequest(new AbortController().signal, token));

      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    },
  );

  it('closes the stream and clears its heartbeat timer when aborted', async () => {
    jest.useFakeTimers();
    const abortController = new AbortController();
    const response = await GET(makeRequest(abortController.signal, makeToken()));
    const reader = response.body?.getReader();

    expect(reader).toBeDefined();
    expect(jest.getTimerCount()).toBe(1);
    await reader?.read();

    abortController.abort();

    await expect(reader?.read()).resolves.toMatchObject({ done: true });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('clears the heartbeat timer when the client cancels the stream', async () => {
    jest.useFakeTimers();
    const response = await GET(
      makeRequest(new AbortController().signal, makeToken()),
    );
    const reader = response.body?.getReader();

    expect(jest.getTimerCount()).toBe(1);
    await reader?.cancel();

    expect(jest.getTimerCount()).toBe(0);
  });
});
