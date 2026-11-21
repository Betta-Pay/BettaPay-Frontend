/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '../route';

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(exp: number): string {
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64Url({ exp });
  return `${header}.${payload}.c2lnbmF0dXJl`;
}

function streamRequest(cookie?: string, signal?: AbortSignal) {
  return new NextRequest('http://localhost:3000/api/notifications/stream', {
    method: 'GET',
    headers: cookie ? { cookie } : undefined,
    signal,
  });
}

describe('GET /api/notifications/stream', () => {
  const inOneHour = Math.floor(Date.now() / 1000) + 3600;
  const anHourAgo = Math.floor(Date.now() / 1000) - 3600;

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 401 when auth_token is missing', async () => {
    const response = await GET(streamRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when auth_token is not a valid session', async () => {
    const missing = await GET(streamRequest('auth_token='));
    const garbage = await GET(streamRequest('auth_token=not-a-jwt'));
    const expired = await GET(streamRequest(`auth_token=${makeToken(anHourAgo)}`));

    expect(missing.status).toBe(401);
    expect(garbage.status).toBe(401);
    expect(expired.status).toBe(401);
  });

  it('streams notifications for a valid auth_token session', async () => {
    const response = await GET(streamRequest(`auth_token=${makeToken(inOneHour)}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    const first = await reader!.read();
    const text = new TextDecoder().decode(first.value);

    expect(text).toContain('event: notification');
    expect(text).toContain('unreadCount');
    await reader!.cancel();
  });

  it('clears timers when the client aborts without throwing after the controller closes', async () => {
    jest.useFakeTimers();
    const abort = new AbortController();
    const response = await GET(
      streamRequest(`auth_token=${makeToken(inOneHour)}`, abort.signal),
    );
    const reader = response.body?.getReader();
    await reader?.read();

    abort.abort();

    expect(() => {
      jest.advanceTimersByTime(60_000);
    }).not.toThrow();

    await reader?.cancel();
  });

  it('clears timers when the stream is cancelled', async () => {
    jest.useFakeTimers();
    const response = await GET(streamRequest(`auth_token=${makeToken(inOneHour)}`));

    await response.body?.cancel();

    expect(() => {
      jest.advanceTimersByTime(60_000);
    }).not.toThrow();
  });
});
