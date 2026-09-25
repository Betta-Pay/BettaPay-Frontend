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

// A real project id is required to pair (issue #500); the relay is mocked here.
jest.mock('@/lib/config', () => ({
  ...jest.requireActual('@/lib/config'),
  WALLETCONNECT_PROJECT_ID: 'test-project-id',
}));

import {
  WalletConnectClient,
  WalletConnectExpiredError,
  WalletConnectTimeoutError,
  type WalletConnectSession,
  getStellarWalletConnectChain,
  getWalletConnectClient,
  resetWalletConnectClient,
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

function makeClient(chainId: 'stellar:testnet' | 'stellar:pubnet' = 'stellar:testnet') {
  const statuses: Array<[WalletConnectStatus, string | undefined]> = [];
  const client = new WalletConnectClient(factory, chainId);
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
  resetWalletConnectClient();
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

describe('chain negotiation', () => {
  it('maps the UI network to the matching chain id', () => {
    expect(getStellarWalletConnectChain('testnet')).toBe('stellar:testnet');
    expect(getStellarWalletConnectChain('public')).toBe('stellar:pubnet');
    expect(getStellarWalletConnectChain('mainnet')).toBe('stellar:pubnet');
  });

  it('keeps the active chain when callers reuse the singleton without a network override', () => {
    const client = getWalletConnectClient('public');
    expect(client.chainId).toBe('stellar:pubnet');
    expect(getWalletConnectClient()).toBe(client);
  });

  it('advertises pubnet and rejects a mismatched wallet session', async () => {
    const { client, statuses } = makeClient('stellar:pubnet');
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri, {
      settleAccounts: [`stellar:testnet:G${'A'.repeat(55)}`],
    });

    expect(lastStatus(statuses)).toBe('error');
    const detail = statuses[statuses.length - 1][1] ?? '';
    expect(detail).toMatch(/reported stellar:testnet/i);

    const publishes = sock
      .parsedSent()
      .filter((m) => m.method === 'irn_publish')
      .map((m) => m.params as { topic: string; message: string });

    const pairingTopic = uri.slice(3, uri.indexOf('@'));
    const symKeyHex = uri.match(/symKey=([0-9a-f]+)/)![1];
    const pairingKey = await importAesKey(symKeyHex);
    const ackPublish = publishes.find((p) => p.topic === pairingTopic)!;
    const ack = JSON.parse(await open(ackPublish.message, pairingKey, pairingTopic)) as { result: { responderPublicKey: string } };
    const sessionKey = await importAesKey(ack.result.responderPublicKey);
    const sessionPublish = publishes.find((p) => p.topic !== pairingTopic)!;
    const settle = JSON.parse(await open(sessionPublish.message, sessionKey, sessionPublish.topic)) as { params: { namespaces: { stellar: { chains: string[] } } } };
    expect(settle.params.namespaces.stellar.chains).toEqual(['stellar:pubnet']);
  });
});

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

  // Issue #764: a silently severed relay (e.g. mobile device lock) must error
  // the pending signature instead of hanging the UI forever.
  it('errors a pending signature when the relay is severed mid-request', async () => {
    const { client, statuses } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri);
    expect(statuses.some(([s]) => s === 'connected')).toBe(true);

    const rejection = client.signTransaction('AAAAtx').catch((e) => e);
    expect(lastStatus(statuses)).toBe('signing');

    // The connection dies right after the request went out; the request
    // itself is still bounded by the signing phase timeout.
    sock.dropFromServer();
    expect(statuses.some(([s]) => s === 'reconnecting')).toBe(true);

    await jest.advanceTimersByTimeAsync(60_000 + 100); // SIGN_TIMEOUT_MS

    const err = await rejection;
    expect(err).toBeInstanceOf(WalletConnectTimeoutError);
    expect(err.phase).toBe('signing');
    expect(lastStatus(statuses)).toBe('error');
  });

  it('rejects a signature with a typed error when the socket is already severed', async () => {
    const { client } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri);

    sock.dropFromServer();
    const rejection = client.signTransaction('AAAAtx').catch((e) => e);
    await drain(); // flush the publish attempt onto the dead socket

    const err = await rejection;
    expect(err).toBeInstanceOf(WalletConnectTimeoutError);
    expect(err.phase).toBe('signing');
  });
});

describe('session disconnect', () => {
  it('handles a wallet-issued session delete by disconnecting cleanly', async () => {
    const { client, statuses } = makeClient();
    const sessionKeyBytes = crypto.getRandomValues(new Uint8Array(32));
    const sessionKeyHex = Array.from(sessionKeyBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const sessionKey = await importAesKey(sessionKeyHex);
    const sessionTopic = 'session-topic';

    await client.restoreSession({
      topic: sessionTopic,
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'],
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      sessionKey: sessionKeyHex,
      sessionKeyVersion: 0,
      expiry: Math.floor(Date.now() / 1000) + 3600,
    });

    const sock = latest();
    sock.deliver(
      relaySub(
        sessionTopic,
        await seal(JSON.stringify({ id: 99, jsonrpc: '2.0', method: 'wc_sessionDelete', params: {} }), sessionKey, sessionTopic),
      ),
    );
    await drain();

    expect(lastStatus(statuses)).toBe('disconnected');
  });
});

// ─── Expiry & replay (issue #499) ────────────────────────────────────────────

const nowS = () => Math.floor(Date.now() / 1000);

function publishedEnvelopes(sock: MockRelaySocket) {
  return sock
    .parsedSent()
    .filter((m) => m.method === 'irn_publish')
    .map((m) => JSON.parse((m.params as { message: string }).message) as Record<string, unknown>);
}

describe('session expiry', () => {
  it('rejects an expired session proposal instead of settling it', async () => {
    const { client, statuses } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri, { proposalExpiry: nowS() - 1 });

    expect(lastStatus(statuses)).toBe('error');
    expect(statuses[statuses.length - 1][1]).toMatch(/expired session proposal/i);
    expect(statuses.some(([s]) => s === 'approving')).toBe(false);
    // No settle, no ack: nothing was published for the stale proposal.
    expect(publishedEnvelopes(sock)).toHaveLength(0);
  });

  it('accepts a live proposal', async () => {
    const { client, statuses } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri, { proposalExpiry: nowS() + 300 });

    expect(lastStatus(statuses)).toBe('connected');
  });

  it('rejects a settle whose expiry has already passed', async () => {
    const { client, statuses } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri, { settleExpiry: nowS() - 1 });

    expect(lastStatus(statuses)).toBe('error');
    expect(statuses[statuses.length - 1][1]).toMatch(/already expired/i);
  });

  it('advertises the pairing expiry in the wc: URI', async () => {
    const { client } = makeClient();
    const uri = await client.connect();
    const expiry = Number(uri.match(/expiryTimestamp=(\d+)/)?.[1]);
    expect(expiry).toBe(Math.floor((Date.now() + 180_000) / 1000));
  });

  it('accepts a session, then tears it down and unsubscribes once it expires', async () => {
    const { client, statuses } = makeClient();
    let session: WalletConnectSession | null = null;
    client.onSession((s) => {
      session = s;
    });
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    const settleExpiry = nowS() + 20;
    const { sessionTopic } = (await drivePairing(client, sock, uri, { settleExpiry }))!;

    // Accepted: connected, expiry stamped on the session, only the session
    // topic is still held (the pairing was released on settle).
    expect(lastStatus(statuses)).toBe('connected');
    expect(session!.expiry).toBe(settleExpiry);
    expect(client.getResourceStats().topics).toBe(1);
    const unsubscribes = () =>
      sock.parsedSent().filter((m) => m.method === 'irn_unsubscribe').map((m) => (m.params as { topic: string }).topic);
    expect(unsubscribes()).toHaveLength(1); // the pairing topic

    // Well inside the 30s heartbeat interval, so only expiry can end it.
    await jest.advanceTimersByTimeAsync(20_000 + 100);

    expect(lastStatus(statuses)).toBe('disconnected');
    expect(unsubscribes()).toContain(sessionTopic);
    expect(client.getResourceStats()).toEqual({
      topics: 0, subscriptions: 0, pendingSubscribes: 0, pendingRequests: 0, ivTopics: 0, ivEntries: 0,
    });

    // Rejected: the expired session can be neither used nor restored.
    await expect(client.signTransaction('AAAAtx')).rejects.toThrow(/no active walletconnect session/i);
    await expect(client.restoreSession(session!)).rejects.toBeInstanceOf(WalletConnectExpiredError);
  });

  it('caps a wallet-proposed expiry at the lifetime we advertised', async () => {
    const { client } = makeClient();
    let session: WalletConnectSession | null = null;
    client.onSession((s) => {
      session = s;
    });
    const uri = await client.connect();
    const sock = latest();
    sock.accept();

    await drivePairing(client, sock, uri, { settleExpiry: nowS() + 365 * 24 * 3600 });

    expect(session!.expiry).toBeLessThanOrEqual(nowS() + 7 * 24 * 3600);
  });

  it('refuses to restore an expired or undated persisted session', async () => {
    const { client } = makeClient();
    const base = {
      topic: 'session-topic',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [`G${'A'.repeat(55)}`],
      address: `G${'A'.repeat(55)}`,
      sessionKey: 'ab'.repeat(32),
    };

    await expect(client.restoreSession({ ...base, expiry: nowS() - 1 })).rejects.toBeInstanceOf(WalletConnectExpiredError);
    await expect(client.restoreSession(base)).rejects.toBeInstanceOf(WalletConnectExpiredError);
    expect(MockRelaySocket.instances).toHaveLength(0);
  });

  it('drops traffic that arrives for a topic after it expired', async () => {
    const { client, statuses } = makeClient();
    const sessionKeyHex = 'cd'.repeat(32);
    const sessionKey = await importAesKey(sessionKeyHex);
    await client.restoreSession({
      topic: 'session-topic',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [`G${'A'.repeat(55)}`],
      address: `G${'A'.repeat(55)}`,
      sessionKey: sessionKeyHex,
      expiry: nowS() + 3600,
    });
    const sock = latest();
    sock.accept();

    // Jump the wall clock past expiry without letting the expiry timer run.
    jest.setSystemTime(Date.now() + 3601 * 1000);
    sock.deliver(
      relaySub('session-topic', await seal(JSON.stringify({ id: 5, jsonrpc: '2.0', method: 'wc_sessionRequest', result: 'x' }), sessionKey, 'session-topic')),
    );
    await drain();

    expect(lastStatus(statuses)).toBe('disconnected');
    expect(client.getResourceStats().topics).toBe(0);
  });
});

describe('envelope replay resistance', () => {
  async function pairedProposalSetup() {
    const { client, statuses } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();
    const pairingTopic = uri.slice(3, uri.indexOf('@'));
    const pairingKey = await importAesKey(uri.match(/symKey=([0-9a-f]+)/)![1]);
    const proposal = JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'wc_sessionPropose',
      params: { id: 1, proposer: { publicKey: 'aa'.repeat(32), metadata: {} }, relays: [], requiredNamespaces: {} },
    });
    return { client, statuses, sock, pairingTopic, pairingKey, proposal };
  }

  it('never puts the symmetric key on the wire and stamps every envelope', async () => {
    const { client } = makeClient();
    const uri = await client.connect();
    const sock = latest();
    sock.accept();
    await drivePairing(client, sock, uri);

    const envelopes = publishedEnvelopes(sock);
    expect(envelopes.length).toBeGreaterThanOrEqual(2); // ack + settle
    for (const env of envelopes) {
      expect(env).not.toHaveProperty('symKey');
      expect(typeof env.ts).toBe('number');
    }
    // Relay TTL no longer outlives the receiver's freshness window.
    const ttls = sock.parsedSent().filter((m) => m.method === 'irn_publish').map((m) => (m.params as { ttl: number }).ttl);
    expect(Math.max(...ttls)).toBeLessThanOrEqual(300);
  });

  it('ignores envelopes older than the freshness window', async () => {
    const { statuses, sock, pairingTopic, pairingKey, proposal } = await pairedProposalSetup();

    sock.deliver(relaySub(pairingTopic, await seal(proposal, pairingKey, pairingTopic, Date.now() - 6 * 60_000)));
    await drain();

    expect(lastStatus(statuses)).toBe('connecting');
    expect(publishedEnvelopes(sock)).toHaveLength(0);
  });

  it('ignores envelopes whose timestamp was tampered with (AAD mismatch)', async () => {
    const { statuses, sock, pairingTopic, pairingKey, proposal } = await pairedProposalSetup();

    const sealed = await seal(proposal, pairingKey, pairingTopic, Date.now() - 6 * 60_000);
    sock.deliver(relaySub(pairingTopic, { ...sealed, ts: Date.now() })); // "refresh" a stale frame
    await drain();

    expect(lastStatus(statuses)).toBe('connecting');
  });

  it('ignores a ciphertext replayed onto a different topic', async () => {
    const { statuses, sock, pairingTopic, pairingKey, proposal } = await pairedProposalSetup();

    const sealedForOtherTopic = await seal(proposal, pairingKey, 'some-other-topic');
    sock.deliver(relaySub(pairingTopic, sealedForOtherTopic));
    await drain();

    expect(lastStatus(statuses)).toBe('connecting');
  });

  it('ignores an exact replay of an accepted envelope', async () => {
    const { statuses, sock, pairingTopic, pairingKey, proposal } = await pairedProposalSetup();

    const sealed = await seal(proposal, pairingKey, pairingTopic);
    sock.deliver(relaySub(pairingTopic, sealed));
    await drain();
    const publishedAfterFirst = publishedEnvelopes(sock).length;
    expect(lastStatus(statuses)).toBe('approving');

    sock.deliver(relaySub(pairingTopic, sealed));
    await drain();
    expect(publishedEnvelopes(sock)).toHaveLength(publishedAfterFirst);
  });
});

describe('resource cleanup', () => {
  it('holds no topics, subscriptions or IV history after repeated pair / disconnect cycles', async () => {
    const { client } = makeClient();
    const zero = { topics: 0, subscriptions: 0, pendingSubscribes: 0, pendingRequests: 0, ivTopics: 0, ivEntries: 0 };
    const sockets = new Set<MockRelaySocket>();

    for (let i = 0; i < 25; i += 1) {
      const uri = await client.connect();
      const sock = latest();
      sockets.add(sock);
      sock.accept();
      // Relay acks the subscribe with a subscription id.
      const sub = sock.parsedSent().find((m) => m.method === 'irn_subscribe')!;
      sock.deliver({ id: sub.id, jsonrpc: '2.0', result: `sub-${i}` });

      await drivePairing(client, sock, uri);
      const live = client.getResourceStats();
      expect(live.topics).toBe(1); // only the session topic
      expect(live.ivEntries).toBeLessThanOrEqual(2);

      client.disconnect();
      expect(client.getResourceStats()).toEqual(zero);
      // Every topic we subscribed to was explicitly unsubscribed.
      const subscribed = new Set(sock.parsedSent().filter((m) => m.method === 'irn_subscribe').map((m) => (m.params as { topic: string }).topic));
      const unsubscribed = new Set(sock.parsedSent().filter((m) => m.method === 'irn_unsubscribe').map((m) => (m.params as { topic: string }).topic));
      expect(unsubscribed).toEqual(subscribed);
    }

    expect(sockets.size).toBe(25);
    expect(client.getResourceStats()).toEqual(zero);
  });

  it('prunes IV history older than the freshness window on long sessions', async () => {
    const { client } = makeClient();
    const sessionKeyHex = 'ef'.repeat(32);
    const sessionKey = await importAesKey(sessionKeyHex);
    await client.restoreSession({
      topic: 'session-topic',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [`G${'A'.repeat(55)}`],
      address: `G${'A'.repeat(55)}`,
      sessionKey: sessionKeyHex,
      expiry: nowS() + 3600,
    });
    const sock = latest();
    sock.accept();

    for (let i = 0; i < 20; i += 1) {
      sock.deliver(relaySub('session-topic', await seal(JSON.stringify({ id: 1000 + i, jsonrpc: '2.0', method: 'wc_sessionPing', params: {} }), sessionKey, 'session-topic')));
    }
    await drain();
    expect(client.getResourceStats().ivEntries).toBe(20);

    // Answer every heartbeat so the socket stays up while the window elapses.
    for (let t = 0; t < 13; t += 1) {
      await jest.advanceTimersByTimeAsync(30_000);
      sock.deliver({ id: 999, jsonrpc: '2.0', result: true });
    }
    expect(MockRelaySocket.instances).toHaveLength(1);

    expect(client.getResourceStats().ivEntries).toBe(0);
    expect(client.getResourceStats().topics).toBe(1);
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

/** Mirrors the client's AAD: topic + key version + sender timestamp. */
const aad = (topic: string, version: number, ts: number) =>
  asBuf(new TextEncoder().encode(`wc2:${topic}:${version}:${ts}`));

/** Encrypt as a wallet peer would. `ts` defaults to now (fake-timer clock). */
async function seal(plaintext: string, key: CryptoKey, topic: string, ts: number = Date.now()) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asBuf(iv), additionalData: aad(topic, 0, ts) },
    key,
    asBuf(new TextEncoder().encode(plaintext)),
  );
  return {
    message: toB64url(new Uint8Array(cipher)),
    iv: toB64url(iv),
    type: 0,
    version: 0,
    ts,
  };
}

async function open(envelopeMessage: string, key: CryptoKey, topic: string): Promise<string> {
  const env = JSON.parse(envelopeMessage) as { message: string; iv: string; version: number; ts: number };
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asBuf(fromB64url(env.iv)), additionalData: aad(topic, env.version, env.ts) },
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
  options?: {
    settleAccounts?: string[];
    /** Unix seconds; omitted from the proposal when undefined. */
    proposalExpiry?: number;
    /** Unix seconds; omitted from the settle when undefined. */
    settleExpiry?: number;
  },
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
      ...(options?.proposalExpiry !== undefined && { expiryTimestamp: options.proposalExpiry }),
    },
  };

  sock.deliver(relaySub(pairingTopic, await seal(JSON.stringify(proposal), pairingKey, pairingTopic)));
  await drain();

  if (options?.proposalExpiry !== undefined && options.proposalExpiry * 1000 <= Date.now()) {
    return; // the client must have refused it — nothing to settle
  }

  // The client has now published the encrypted ack on the pairing topic and a
  // settle on a fresh session topic. Recover the session key from the ack.
  const publishes = sock
    .parsedSent()
    .filter((m) => m.method === 'irn_publish')
    .map((m) => m.params as { topic: string; message: string });

  const ackPublish = publishes.find((p) => p.topic === pairingTopic)!;
  const ack = JSON.parse(await open(ackPublish.message, pairingKey, pairingTopic)) as {
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
        stellar: { accounts: options?.settleAccounts ?? [`stellar:testnet:G${'A'.repeat(55)}`] },
      },
      controller: {
        metadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      },
      ...(options?.settleExpiry !== undefined && { expiry: options.settleExpiry }),
    },
  };

  sock.deliver(relaySub(sessionTopic, await seal(JSON.stringify(settle), sessionKey, sessionTopic)));
  await drain();

  return { pairingTopic, pairingKey, sessionTopic, sessionKey };
}
