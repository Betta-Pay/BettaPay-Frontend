/**
 * Resilience tests for the raw WalletConnect relay client (issue #498):
 * reconnect-with-backoff, heartbeat/staleness detection, and phase timeouts.
 *
 * The relay socket is fully mocked and injected via the client's `wsFactory`
 * constructor seam. `crypto.subtle` is polyfilled from Node's WebCrypto because
 * jsdom does not implement it.
 */

import { webcrypto } from 'node:crypto';

if (!(globalThis.crypto && 'subtle' in globalThis.crypto)) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

import {
  WalletConnectClient,
  WalletConnectTimeoutError,
  type WalletConnectStatus,
} from '@/lib/stellar/walletconnect';

// ─── Mock relay socket ───────────────────────────────────────────────────────

type Handler = ((ev: unknown) => void) | null;

class MockRelaySocket {
  static instances: MockRelaySocket[] = [];
  static reset() {
    MockRelaySocket.instances = [];
  }

  readonly url: string;
  readyState = 0; // CONNECTING
  sent: string[] = [];
  onopen: Handler = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: Handler = null;
  onclose: Handler = null;

  constructor(url: string) {
    this.url = url;
    MockRelaySocket.instances.push(this);
  }

  send(data: string) {
    if (this.readyState !== 1) throw new Error('socket not open');
    this.sent.push(data);
  }

  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.(undefined);
  }

  // ── test controls ──────────────────────────────────────────────────────────
  accept() {
    this.readyState = 1;
    this.onopen?.(undefined);
  }

  dropFromServer() {
    this.readyState = 3;
    this.onclose?.(undefined);
  }

  deliver(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  parsedSent() {
    return this.sent.map((s) => JSON.parse(s) as Record<string, unknown>);
  }
}

const factory = (url: string) =>
  new MockRelaySocket(url) as unknown as WebSocket;

const latest = () =>
  MockRelaySocket.instances[MockRelaySocket.instances.length - 1];

function makeClient() {
  const statuses: Array<[WalletConnectStatus, string | undefined]> = [];
  const client = new WalletConnectClient(factory);
  client.onStatus((s, d) => statuses.push([s, d]));
  return { client, statuses };
}

const lastStatus = (statuses: Array<[WalletConnectStatus, string | undefined]>) =>
  statuses[statuses.length - 1]?.[0];

beforeEach(() => {
  MockRelaySocket.reset();
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ─── Reconnect ───────────────────────────────────────────────────────────────

describe('relay reconnection', () => {
  it('reconnects with backoff after an unexpected close and restores status', async () => {
    const { client, statuses } = makeClient();
    await client.connect();

    const first = latest();
    first.accept();
    expect(lastStatus(statuses)).toBe('connecting');

    first.dropFromServer();
    expect(lastStatus(statuses)).toBe('reconnecting');
    expect(MockRelaySocket.instances).toHaveLength(1); // not opened yet — backing off

    await jest.advanceTimersByTimeAsync(1_300); // base 1s + jitter < 250ms
    expect(MockRelaySocket.instances).toHaveLength(2);

    const second = latest();
    second.accept();

    // Re-subscribed to the pairing topic on the fresh socket…
    expect(
      second.parsedSent().some((m) => m.method === 'irn_subscribe'),
    ).toBe(true);
    // …and the UI is taken back out of the "reconnecting" state.
    expect(lastStatus(statuses)).toBe('connecting');
  });

  it('uses exponential backoff between attempts', async () => {
    const warn = console.warn as jest.Mock;
    const { client } = makeClient();
    await client.connect();
    latest().accept();

    const delays: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      latest().dropFromServer();
      const line = warn.mock.calls
        .map((c) => String(c[0]))
        .find((l) => l.includes('reconnecting to relay in') && !delays.includes(matchDelay(l)));
      if (line) delays.push(matchDelay(line));
      await jest.advanceTimersByTimeAsync(RECONNECT_CEIL);
    }

    // 1s → 2s → 4s → 8s, ignoring jitter
    expect(delays[0]).toBeGreaterThanOrEqual(1_000);
    expect(delays[1]).toBeGreaterThanOrEqual(2_000);
    expect(delays[2]).toBeGreaterThanOrEqual(4_000);
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
  });

  it('gives up after the reconnect budget with a typed connection error', async () => {
    const { client, statuses } = makeClient();
    await client.connect();
    latest().accept();

    // Never let a socket succeed: close-then-wait, six times.
    for (let i = 0; i < 7; i += 1) {
      latest().dropFromServer();
      await jest.advanceTimersByTimeAsync(RECONNECT_CEIL);
    }

    expect(lastStatus(statuses)).toBe('error');
    const detail = statuses[statuses.length - 1][1] ?? '';
    expect(detail).toMatch(/could not reconnect/i);
  });

  it('does not reconnect after an intentional disconnect', async () => {
    const { client, statuses } = makeClient();
    await client.connect();
    latest().accept();

    client.disconnect();
    const count = MockRelaySocket.instances.length;

    await jest.advanceTimersByTimeAsync(60_000);

    expect(MockRelaySocket.instances).toHaveLength(count);
    expect(lastStatus(statuses)).toBe('disconnected');
  });
});

// ─── Heartbeat ───────────────────────────────────────────────────────────────

describe('relay heartbeat', () => {
  it('pings the relay on an interval and reconnects when a ping goes unanswered', async () => {
    const { client, statuses } = makeClient();
    await client.connect();

    const sock = latest();
    sock.accept();
    sock.sent.length = 0; // drop the initial subscribe

    await jest.advanceTimersByTimeAsync(30_000 + 5); // HEARTBEAT_INTERVAL_MS
    expect(
      sock.parsedSent().some((m) => m.method === 'irn_subscribe'),
    ).toBe(true);

    // No reply within the heartbeat grace period → force reconnect.
    await jest.advanceTimersByTimeAsync(10_000 + 5); // HEARTBEAT_TIMEOUT_MS
    expect(statuses.some(([s]) => s === 'reconnecting')).toBe(true);
  });

  it('does not tear down the socket when the relay answers in time', async () => {
    const { client, statuses } = makeClient();
    await client.connect();
    const sock = latest();
    sock.accept();

    await jest.advanceTimersByTimeAsync(30_000 + 5);
    sock.deliver({ id: 999, jsonrpc: '2.0', result: 'sub-id' }); // pong
    await jest.advanceTimersByTimeAsync(10_000 + 5);

    expect(statuses.some(([s]) => s === 'reconnecting')).toBe(false);
    expect(MockRelaySocket.instances).toHaveLength(1);
  });
});

// ─── Phase timeouts ──────────────────────────────────────────────────────────

describe('phase timeouts', () => {
  it('aborts pairing with a typed timeout error if no wallet connects', async () => {
    const { client, statuses } = makeClient();
    await client.connect();
    latest().accept();

    await jest.advanceTimersByTimeAsync(180_000 + 100); // PAIRING_TIMEOUT_MS

    expect(lastStatus(statuses)).toBe('error');
    expect(statuses[statuses.length - 1][1]).toMatch(/no wallet connected/i);
  });

  it('never leaves the client stuck: signing auto-aborts after its budget', async () => {
    const { client, statuses } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri);
    expect(statuses.some(([s]) => s === 'connected')).toBe(true);

    const rejection = client.signTransaction('AAAAtx').catch((e) => e);
    expect(lastStatus(statuses)).toBe('signing');

    await jest.advanceTimersByTimeAsync(60_000 + 100); // SIGN_TIMEOUT_MS

    const err = await rejection;
    expect(err).toBeInstanceOf(WalletConnectTimeoutError);
    expect(err.phase).toBe('signing');
    expect(lastStatus(statuses)).toBe('error');
  });
});

// ─── Handshake helpers ───────────────────────────────────────────────────────

const RECONNECT_CEIL = 30_000 + 300;

/** Let queued microtasks (incl. WebCrypto promise chains) drain under fake timers. */
async function drain() {
  for (let i = 0; i < 12; i += 1) {
    await jest.advanceTimersByTimeAsync(1);
  }
}

function matchDelay(line: string): number {
  const m = line.match(/in (\d+)ms/);
  return m ? Number(m[1]) : 0;
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

function toB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(
    atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=')),
    (c) => c.charCodeAt(0),
  );
}

// Web Crypto's lib.dom typings reject a plain Uint8Array under TS 5.7's
// stricter ArrayBufferLike checks; the production module casts the same way.
const asBuf = (b: Uint8Array) => b as unknown as BufferSource;

async function importAesKey(hex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', asBuf(hexToBytes(hex)), { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ]);
}

async function seal(plaintext: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asBuf(iv) },
    key,
    asBuf(new TextEncoder().encode(plaintext)),
  );
  return {
    message: toB64url(new Uint8Array(cipher)),
    iv: toB64url(iv),
    symKey: '',
    type: 0,
    version: 0,
  };
}

async function open(envelopeMessage: string, key: CryptoKey): Promise<string> {
  const env = JSON.parse(envelopeMessage) as { message: string; iv: string };
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asBuf(fromB64url(env.iv)) },
    key,
    asBuf(fromB64url(env.message)),
  );
  return new TextDecoder().decode(buf);
}

function relaySub(topic: string, envelope: unknown) {
  return {
    id: Math.floor(Math.random() * 1e6),
    jsonrpc: '2.0',
    method: 'irn_subscription',
    params: {
      id: 'srv-sub',
      data: { topic, message: JSON.stringify(envelope), publishedAt: 1 },
    },
  };
}

/** Run the propose → ack → settle handshake so the client reaches `connected`. */
async function drivePairing(
  client: WalletConnectClient,
  sock: MockRelaySocket,
  uri: string,
) {
  const pairingTopic = uri.slice(3, uri.indexOf('@'));
  const symKeyHex = uri.match(/symKey=([0-9a-f]+)/)![1];
  const pairingKey = await importAesKey(symKeyHex);

  const proposal = {
    id: 4242,
    jsonrpc: '2.0',
    method: 'wc_sessionPropose',
    params: {
      id: 4242,
      proposer: {
        publicKey: 'aa'.repeat(32),
        metadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      },
      relays: [{ protocol: 'irn' }],
      requiredNamespaces: {},
    },
  };

  sock.deliver(relaySub(pairingTopic, await seal(JSON.stringify(proposal), pairingKey)));
  await drain();

  // The client has now published the encrypted ack on the pairing topic and a
  // settle on a fresh session topic. Recover the session key from the ack.
  const publishes = sock
    .parsedSent()
    .filter((m) => m.method === 'irn_publish')
    .map((m) => m.params as { topic: string; message: string });

  const ackPublish = publishes.find((p) => p.topic === pairingTopic)!;
  const ack = JSON.parse(await open(ackPublish.message, pairingKey)) as {
    result: { responderPublicKey: string };
  };
  const sessionKey = await importAesKey(ack.result.responderPublicKey);
  const sessionTopic = publishes.find((p) => p.topic !== pairingTopic)!.topic;

  const settle = {
    id: 7,
    jsonrpc: '2.0',
    method: 'wc_sessionSettle',
    params: {
      namespaces: {
        stellar: { accounts: [`stellar:testnet:G${'A'.repeat(55)}`] },
      },
      controller: {
        metadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      },
    },
  };

  sock.deliver(relaySub(sessionTopic, await seal(JSON.stringify(settle), sessionKey)));
  await drain();
}
