/**
 * WalletConnect v2 session manager for Stellar.
 *
 * Implements the WalletConnect v2 relay protocol over a plain WebSocket —
 * no SDK required. The flow follows the WalletConnect 2.0 spec:
 *
 *   1. Generate a random symmetric key (topic + key for the pairing).
 *   2. Build a `wc:` URI containing the relay URL and the symmetric key.
 *   3. Subscribe to the pairing topic on the relay.
 *   4. The mobile wallet scans the QR code, connects to the relay, and sends
 *      a `wc_sessionPropose` request encrypted with the pairing key.
 *   5. We approve the proposal, negotiate a session topic + key, and
 *      receive the wallet's Stellar account(s).
 *   6. For signing, we send a `stellar_signTransaction` JSON-RPC request on
 *      the session topic and receive the signed XDR back.
 *
 * Encryption uses AES-256-GCM via Web Crypto (available in all modern
 * browsers and Next.js Edge/Node runtimes ≥ 18).
 *
 * Reference: https://specs.walletconnect.com/2.0/
 */

import { extractValidStellarAddresses } from './utils';
import {
  WALLETCONNECT_RELAY_URL,
  WALLETCONNECT_PROJECT_ID,
  SITE_URL,
} from '@/lib/config';

// ─── Constants ────────────────────────────────────────────────────────────────

const RELAY_URL = WALLETCONNECT_RELAY_URL;

const PROJECT_ID = WALLETCONNECT_PROJECT_ID;

export type StellarWalletConnectNetwork = 'testnet' | 'public';
export type StellarWalletConnectChainId =
  typeof STELLAR_TESTNET_CHAIN | typeof STELLAR_PUBNET_CHAIN;

/** CAIP-2 chain identifiers for Stellar. */
export const STELLAR_TESTNET_CHAIN = 'stellar:testnet';
export const STELLAR_PUBNET_CHAIN = 'stellar:pubnet';

/** Maps the UI wallet network to the CAIP-2 Stellar chain used by WalletConnect. */
export const STELLAR_WALLETCONNECT_CHAIN_BY_NETWORK: Record<
  StellarWalletConnectNetwork,
  StellarWalletConnectChainId
> = {
  testnet: STELLAR_TESTNET_CHAIN,
  public: STELLAR_PUBNET_CHAIN,
};

export function normalizeWalletNetwork(
  network: string = 'testnet',
): StellarWalletConnectNetwork {
  const normalized = network.toLowerCase().trim();
  return normalized === 'public' || normalized === 'mainnet' || normalized === 'pubnet'
    ? 'public'
    : 'testnet';
}

export function getStellarWalletConnectChain(
  network: string = 'testnet',
): StellarWalletConnectChainId {
  return STELLAR_WALLETCONNECT_CHAIN_BY_NETWORK[normalizeWalletNetwork(network)];
}

/** WalletConnect relay JSON-RPC method */
const RELAY_PUBLISH = 'irn_publish';
const RELAY_SUBSCRIBE = 'irn_subscribe';
const RELAY_UNSUBSCRIBE = 'irn_unsubscribe';
const RELAY_SUBSCRIPTION = 'irn_subscription';

/** App-level WalletConnect methods */
const METHOD_SESSION_PROPOSE = 'wc_sessionPropose';
const METHOD_SESSION_SETTLE = 'wc_sessionSettle';
const METHOD_SESSION_REQUEST = 'wc_sessionRequest';
const METHOD_SESSION_DELETE = 'wc_sessionDelete';
const METHOD_STELLAR_SIGN_TX = 'stellar_signTransaction';
const METHOD_STELLAR_SIGN_MSG = 'stellar_signMessage';

// ─── Resilience tuning ───────────────────────────────────────────────────────
//
// The relay link is a raw browser WebSocket with no protocol-level keepalive we
// can observe, so a dropped connection can otherwise sit undetected for minutes
// (until the OS TCP timeout) while the UI spins forever. These bounds make a
// transient blip self-heal and guarantee every phase eventually terminates.

/** Reconnect attempts before we give up and surface a typed error. */
const RECONNECT_MAX_ATTEMPTS = 5;
/** First backoff delay; doubles each attempt. */
const RECONNECT_BASE_DELAY_MS = 1_000;
/** Backoff ceiling. */
const RECONNECT_MAX_DELAY_MS = 30_000;
/** How often to poke the relay to prove the socket is still alive. */
const HEARTBEAT_INTERVAL_MS = 30_000;
/** Grace period for the relay to answer a heartbeat before we treat it dead. */
const HEARTBEAT_TIMEOUT_MS = 10_000;
/** Max time to wait for a wallet to scan the QR and propose a session. */
const PAIRING_TIMEOUT_MS = 180_000;
/** Max time between receiving a proposal and the wallet settling the session. */
const APPROVE_TIMEOUT_MS = 30_000;
/** Max time to wait for a signature before auto-aborting the request. */
const SIGN_TIMEOUT_MS = 60_000;

// ─── Expiry & replay tuning (issue #499) ─────────────────────────────────────

/** Lifetime we advertise (and enforce) for a settled session. */
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;
/** Envelopes older than this are rejected, bounding the replay window. */
const ENVELOPE_MAX_AGE_MS = 5 * 60_000;
/** Tolerated sender clock drift for envelopes stamped in the future. */
const ENVELOPE_MAX_SKEW_MS = 60_000;
/** How often expired topics (and stale IV history) are purged. */
const TOPIC_PURGE_INTERVAL_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletConnectSession {
  topic: string;
  peerMetadata: WCPeerMetadata;
  stellarAccounts: string[];
  /** Primary Stellar G-address derived from the session */
  address: string;
  /** Hex-encoded WalletConnect session key used to resume relay traffic. */
  sessionKey?: string;
  sessionKeyVersion?: number;
  /** Unix seconds after which the session is dead and must not be reused. */
  expiry?: number;
}

interface WCPeerMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

interface WCRelayMessage {
  id: number;
  jsonrpc: '2.0';
  method?: string;
  result?: unknown;
  error?: { code: number; message: string };
  params?: unknown;
}

/**
 * Encrypted relay payload. The topic key is never carried on the wire — both
 * peers already hold it from the pairing URI / proposal response.
 *
 * `topic`, `version` and the sender timestamp `ts` are bound into the AES-GCM
 * additional authenticated data (see `envelopeAad`), so a ciphertext cannot be
 * replayed onto another topic or key version, and its age cannot be forged to
 * slip past the freshness check (issue #499).
 */
interface WCEncryptedEnvelope {
  /** Base64url-encoded ciphertext */
  message: string;
  /** Base64url-encoded 12-byte IV */
  iv: string;
  /** Encryption type — 0 = AES-256-GCM */
  type: number;
  /** Key version/derivation counter */
  version: number;
  /** Sender timestamp, epoch milliseconds (authenticated via AAD). */
  ts: number;
}

export type WalletConnectStatus =
  | 'idle'
  | 'connecting'        // WebSocket open, waiting for wallet to scan
  | 'reconnecting'      // relay socket dropped, backing off and retrying
  | 'approving'         // session_proposal received, sending settle
  | 'connected'         // session active
  | 'signing'           // waiting for sign response
  | 'disconnected'
  | 'error';

export type StatusListener = (status: WalletConnectStatus, detail?: string) => void;

// ─── Typed errors ────────────────────────────────────────────────────────────

/** Which phase of the WalletConnect flow an error occurred in. */
export type WalletConnectErrorPhase =
  | 'pairing'
  | 'approving'
  | 'signing'
  | 'relay';

/** Base class for every error this module surfaces to callers / the UI. */
export class WalletConnectError extends Error {
  readonly phase: WalletConnectErrorPhase;
  constructor(message: string, phase: WalletConnectErrorPhase) {
    super(message);
    this.name = 'WalletConnectError';
    this.phase = phase;
  }
}

/** A phase exceeded its time budget and was auto-aborted. */
export class WalletConnectTimeoutError extends WalletConnectError {
  constructor(phase: WalletConnectErrorPhase, message: string) {
    super(message, phase);
    this.name = 'WalletConnectTimeoutError';
  }
}

/** The relay socket could not be (re)established within the reconnect budget. */
export class WalletConnectConnectionError extends WalletConnectError {
  constructor(message: string) {
    super(message, 'relay');
    this.name = 'WalletConnectConnectionError';
  }
}

/**
 * `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is missing, so the relay would reject
 * the pairing. Raised before any socket is opened or QR code produced.
 */
export class WalletConnectConfigError extends WalletConnectError {
  constructor() {
    super(
      'WalletConnect is not configured: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set.',
      'pairing',
    );
    this.name = 'WalletConnectConfigError';
  }
}

/** A proposal, settle or persisted session was past its expiry and was refused. */
export class WalletConnectExpiredError extends WalletConnectError {
  constructor(message: string, phase: WalletConnectErrorPhase) {
    super(message, phase);
    this.name = 'WalletConnectExpiredError';
  }
}

let warnedMissingProjectId = false;

/**
 * True when a WalletConnect project id is configured. Without one the relay
 * rejects the pairing, so the UI must show a configuration error instead of a
 * QR code that can never settle (issue #500). Logs a one-time dev warning.
 */
export function isWalletConnectConfigured(): boolean {
  if (PROJECT_ID) return true;
  if (process.env.NODE_ENV !== 'production' && !warnedMissingProjectId) {
    warnedMissingProjectId = true;
    console.warn(
      '[WalletConnect] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect ' +
        'pairing is disabled. Create a project at https://cloud.walletconnect.com and add ' +
        'its id to .env.local (see README → Environment variables).',
    );
  }
  return false;
}

export class WalletConnectNetworkMismatchError extends WalletConnectError {
  readonly expectedChainId: StellarWalletConnectChainId;
  readonly reportedChainIds: StellarWalletConnectChainId[];

  constructor(expectedChainId: StellarWalletConnectChainId, reportedChainIds: StellarWalletConnectChainId[]) {
    const reportedLabel =
      reportedChainIds.length > 0 ? reportedChainIds.join(', ') : 'no Stellar network';
    super(
      `WalletConnect session reported ${reportedLabel}, but the UI is set to ${expectedChainId}.`,
      'approving',
    );
    this.name = 'WalletConnectNetworkMismatchError';
    this.expectedChainId = expectedChainId;
    this.reportedChainIds = reportedChainIds;
  }
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function generateSymKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

async function importRawKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bytes as unknown as BufferSource, 'AES-GCM', true, [
    'encrypt',
    'decrypt',
  ]);
}

/** AES-GCM additional data binding an envelope to its topic, key version and send time. */
function envelopeAad(topic: string, version: number, ts: number): Uint8Array {
  return new TextEncoder().encode(`wc2:${topic}:${version}:${ts}`);
}

async function encrypt(
  plaintext: string,
  key: CryptoKey,
  topic: string,
  version: number,
): Promise<WCEncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ts = Date.now();
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: envelopeAad(topic, version, ts) as unknown as BufferSource,
    },
    key,
    encoded,
  );
  return {
    message: toBase64url(new Uint8Array(cipherBuf)),
    iv: toBase64url(iv),
    type: 0,
    version,
    ts,
  };
}

async function decrypt(
  envelope: WCEncryptedEnvelope,
  key: CryptoKey,
  topic: string,
): Promise<string> {
  const iv = fromBase64url(envelope.iv);
  const ciphertext = fromBase64url(envelope.message);
  const plainBuf = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: envelopeAad(topic, envelope.version, envelope.ts) as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource,
  );
  return new TextDecoder().decode(plainBuf);
}

/** True when an envelope's authenticated timestamp is inside the freshness window. */
function isEnvelopeFresh(envelope: WCEncryptedEnvelope, now: number): boolean {
  if (typeof envelope.ts !== 'number' || !Number.isFinite(envelope.ts)) return false;
  return now - envelope.ts <= ENVELOPE_MAX_AGE_MS && envelope.ts - now <= ENVELOPE_MAX_SKEW_MS;
}

function getStellarChainFromAccount(accountId: string): StellarWalletConnectChainId | null {
  const match = accountId.match(/^stellar:([a-z]+):/i);
  if (!match) return null;
  const normalized = match[1].toLowerCase();
  if (normalized === 'testnet') return STELLAR_TESTNET_CHAIN;
  if (normalized === 'public' || normalized === 'mainnet' || normalized === 'pubnet') {
    return STELLAR_PUBNET_CHAIN;
  }
  return null;
}

// ─── Base64url helpers ────────────────────────────────────────────────────────

function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64url(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new WalletConnectError('Invalid WalletConnect session key.', 'relay');
  }
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));
}

function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToHex(arr);
}

// ─── WalletConnect client ─────────────────────────────────────────────────────

export class WalletConnectClient {
  private ws: WebSocket | null = null;
  private pairingTopic: string = '';
  private pairingKey: CryptoKey | null = null;
  private pairingKeyVersion: number = 0;
  private sessionTopic: string = '';
  private sessionKey: CryptoKey | null = null;
  private sessionKeyVersion: number = 0;
  private sessionKeyHex: string = '';
  private pendingRequests = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  /**
   * Seen `version:iv` → envelope timestamp, per topic, to detect IV reuse.
   * Entries older than ENVELOPE_MAX_AGE_MS are pruned: such envelopes are
   * rejected as stale anyway, so the history stays bounded on long sessions.
   */
  private usedIvs = new Map<string, Map<string, number>>();
  /** Every topic we are subscribed to, with the epoch-ms deadline it dies at. */
  private topicExpiry = new Map<string, number>();
  /** Relay subscription id per topic, needed for `irn_unsubscribe`. */
  private subscriptionIds = new Map<string, string>();
  /** In-flight `irn_subscribe` rpc id → topic, resolved into `subscriptionIds`. */
  private pendingSubscribes = new Map<number, string>();
  private sessionExpiresAt = 0;
  private sessionExpiryTimer: ReturnType<typeof setTimeout> | null = null;
  private purgeTimer: ReturnType<typeof setInterval> | null = null;
  private rpcId = 1;
  private statusListener: StatusListener | null = null;
  private sessionListener: ((session: WalletConnectSession) => void) | null = null;

  // ── Resilience state ───────────────────────────────────────────────────────
  /** Last URL used to open the relay socket, replayed on reconnect. */
  private wsUrl = '';
  /** True once we (not the relay) decided to tear the socket down — suppresses reconnect. */
  private intentionalClose = false;
  /** Consecutive failed reconnects; reset to 0 on a clean open. */
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  /** Deadline timer for the current phase (pairing / approving / signing). */
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  /** Status to restore once a reconnect succeeds. */
  private statusBeforeReconnect: WalletConnectStatus | null = null;
  /** Last status handed to the listener — the source of truth for restore/guard logic. */
  private currentStatus: WalletConnectStatus = 'idle';

  /**
   * @param wsFactory Socket constructor, injectable for tests. Defaults to the
   *   platform `WebSocket`.
   */
  constructor(
    private readonly wsFactory: (url: string) => WebSocket = (url) =>
      new WebSocket(url),
    public readonly chainId: StellarWalletConnectChainId =
      getStellarWalletConnectChain(),
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  onStatus(cb: StatusListener) {
    this.statusListener = cb;
  }

  onSession(cb: (session: WalletConnectSession) => void) {
    this.sessionListener = cb;
  }

  /**
   * Begin a new pairing. Returns the `wc:` URI to encode in the QR code.
   */
  async connect(): Promise<string> {
    // Fail fast: an empty project id is rejected by the relay, so never hand
    // the UI a QR code that cannot pair.
    if (!isWalletConnectConfigured()) throw new WalletConnectConfigError();

    this.cleanup();
    this.emit('connecting');

    // Generate a fresh pairing topic + symmetric key. The pairing lives exactly
    // as long as the wallet is given to scan, and is purged after that.
    const pairingExpiresAt = Date.now() + PAIRING_TIMEOUT_MS;
    this.pairingTopic = randomHex(32);
    this.topicExpiry.set(this.pairingTopic, pairingExpiresAt);
    this.pairingKey = await generateSymKey();
    this.pairingKeyVersion = 0;
    const rawKey = await exportRawKey(this.pairingKey);

    // Build the wc: URI per WC v2 spec
    // wc:<topic>@2?relay-protocol=irn&symKey=<hex>&expiryTimestamp=<unix s>&projectId=<id>
    const symKeyHex = bytesToHex(rawKey);
    const uri =
      `wc:${this.pairingTopic}@2` +
      `?relay-protocol=irn` +
      `&symKey=${symKeyHex}` +
      `&expiryTimestamp=${Math.floor(pairingExpiresAt / 1000)}` +
      `&projectId=${PROJECT_ID}`;

    // Open relay WebSocket. From here on, an unexpected close triggers the
    // reconnect path rather than a permanent wedge.
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.wsUrl = `${RELAY_URL}?projectId=${PROJECT_ID}&ua=BettaPay%2F1.0`;
    this.openSocket();
    this.startTopicPurge();

    // The wallet has a bounded window to scan the QR and propose a session.
    this.setPhaseTimeout('pairing', PAIRING_TIMEOUT_MS);

    return uri;
  }

  async restoreSession(session: WalletConnectSession): Promise<void> {
    if (!session.sessionKey) {
      throw new WalletConnectError('WalletConnect session cannot be restored without a session key.', 'relay');
    }
    if (!isWalletConnectConfigured()) throw new WalletConnectConfigError();
    // A session without an expiry predates enforcement and cannot be trusted
    // to still be alive on the wallet side; an expired one must never be reused.
    if (!session.expiry || session.expiry * 1000 <= Date.now()) {
      throw new WalletConnectExpiredError('WalletConnect session has expired. Please reconnect your wallet.', 'relay');
    }

    this.cleanup();
    this.sessionTopic = session.topic;
    this.setSessionExpiry(session.expiry * 1000);
    this.sessionKey = await importRawKey(hexToBytes(session.sessionKey));
    this.sessionKeyVersion = session.sessionKeyVersion ?? 0;
    this.sessionKeyHex = session.sessionKey;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.wsUrl = `${RELAY_URL}?projectId=${PROJECT_ID}&ua=BettaPay%2F1.0`;
    this.openSocket();
    this.startTopicPurge();
    this.emit('connected');
  }

  /**
   * Sign a Stellar transaction XDR via the active WalletConnect session.
   * Returns the signed XDR string.
   */
  async signTransaction(xdr: string): Promise<string> {
    return this.sendSessionRequest<string>(METHOD_STELLAR_SIGN_TX, { xdr });
  }

  /**
   * Sign a plaintext challenge via the active WalletConnect session.
   * Returns the base64-encoded signature string.
   */
  async signMessage(message: string, address: string): Promise<string> {
    return this.sendSessionRequest<string>(METHOD_STELLAR_SIGN_MSG, {
      message,
      address,
    });
  }

  /** Disconnect and clean up. */
  disconnect() {
    this.cleanup();
    this.emit('disconnected');
  }

  /**
   * Live resource counts, for leak diagnostics and tests: after a disconnect
   * every figure is zero, however many pairings came before (issue #499).
   */
  getResourceStats() {
    let ivEntries = 0;
    for (const ivs of this.usedIvs.values()) ivEntries += ivs.size;
    return {
      topics: this.topicExpiry.size,
      subscriptions: this.subscriptionIds.size,
      pendingSubscribes: this.pendingSubscribes.size,
      pendingRequests: this.pendingRequests.size,
      ivTopics: this.usedIvs.size,
      ivEntries,
    };
  }

  /** Abort a pending connection if the user closes the modal early. */
  abortInitialization() {
    if (this.currentStatus === 'connecting' || this.currentStatus === 'reconnecting') {
      this.disconnect();
    }
  }

  // ── WebSocket lifecycle ─────────────────────────────────────────────────────

  /** (Re)open the relay socket against the last known URL and wire handlers. */
  private openSocket() {
    this.clearReconnectTimer();
    const ws = this.wsFactory(this.wsUrl);
    this.ws = ws;
    ws.onopen = () => this.onWsOpen();
    ws.onmessage = (ev) => void this.onWsMessage(ev.data as string);
    ws.onerror = () => this.onWsError();
    ws.onclose = () => this.onWsClose();
  }

  private onWsOpen() {
    const reconnected = this.statusBeforeReconnect !== null;
    this.reconnectAttempts = 0;

    // Re-establish every subscription we depend on. Re-subscribing an already
    // known topic is idempotent on the relay.
    // Drop anything that expired while we were offline rather than reviving it.
    this.purgeExpiredTopics();
    if (!this.ws) return; // the purge expired the session and tore everything down
    this.pendingSubscribes.clear();
    if (this.pairingTopic) this.subscribe(this.pairingTopic);
    if (this.sessionTopic) this.subscribe(this.sessionTopic);

    this.startHeartbeat();

    if (reconnected) {
      const restore = this.statusBeforeReconnect ?? 'connecting';
      this.statusBeforeReconnect = null;
      console.info('[WalletConnect] relay reconnected, resuming as', restore);
      this.emit(restore);
    }
  }

  private onWsError() {
    // Browsers fire `error` then `close`; let the close handler drive recovery.
    console.warn('[WalletConnect] relay socket error');
  }

  private onWsClose() {
    this.stopHeartbeat();
    if (this.intentionalClose) return;
    console.warn('[WalletConnect] relay socket closed unexpectedly');
    this.scheduleReconnect();
  }

  // ── Reconnection ───────────────────────────────────────────────────────────

  private scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalClose) return;
    if (
      this.currentStatus === 'idle' ||
      this.currentStatus === 'disconnected' ||
      this.currentStatus === 'error'
    ) {
      return;
    }

    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      console.error(
        `[WalletConnect] relay reconnect budget exhausted after ${this.reconnectAttempts} attempts`,
      );
      this.failWith(
        new WalletConnectConnectionError(
          'Lost the connection to the WalletConnect relay and could not reconnect. Please try again.',
        ),
      );
      return;
    }

    const attempt = this.reconnectAttempts + 1;
    const backoff = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1),
      RECONNECT_MAX_DELAY_MS,
    );
    // Jitter avoids a thundering herd of clients all retrying on the same tick.
    const delay = backoff + Math.floor(Math.random() * 250);

    if (this.statusBeforeReconnect === null) {
      this.statusBeforeReconnect =
        this.currentStatus === 'reconnecting' ? 'connecting' : this.currentStatus;
    }

    console.warn(
      `[WalletConnect] reconnecting to relay in ${delay}ms (attempt ${attempt}/${RECONNECT_MAX_ATTEMPTS})`,
    );
    this.emit(
      'reconnecting',
      `Reconnecting to the relay (attempt ${attempt} of ${RECONNECT_MAX_ATTEMPTS})…`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts = attempt;
      console.info(
        `[WalletConnect] reconnect attempt ${attempt}/${RECONNECT_MAX_ATTEMPTS}`,
      );
      this.openSocket();
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Heartbeat ──────────────────────────────────────────────────────────────

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      HEARTBEAT_INTERVAL_MS,
    );
  }

  private sendHeartbeat() {
    const topic = this.sessionTopic || this.pairingTopic;
    if (!this.ws || this.ws.readyState !== 1 /* OPEN */ || !topic) return;

    // A re-subscribe doubles as a ping: the relay always answers with a result,
    // and re-subscribing a live topic is a no-op.
    try {
      this.ws.send(
        JSON.stringify({
          id: this.nextId(),
          jsonrpc: '2.0',
          method: RELAY_SUBSCRIBE,
          params: { topic },
        }),
      );
    } catch {
      this.handleDeadSocket();
      return;
    }

    if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer);
    this.heartbeatTimeoutTimer = setTimeout(() => {
      console.warn('[WalletConnect] relay heartbeat timed out — forcing reconnect');
      this.handleDeadSocket();
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /** Any inbound frame is proof the link is alive — clears the pong deadline. */
  private noteRelayActivity() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private handleDeadSocket() {
    this.stopHeartbeat();
    if (this.intentionalClose) return;
    try {
      this.ws?.close();
    } catch {
      /* already closing */
    }
    // A manually-closed broken socket does not always fire `onclose`, so drive
    // the reconnect directly too (scheduleReconnect is idempotent).
    this.scheduleReconnect();
  }

  // ── Phase timeouts ─────────────────────────────────────────────────────────

  private setPhaseTimeout(phase: WalletConnectErrorPhase, ms: number) {
    this.clearPhaseTimeout();
    this.phaseTimer = setTimeout(() => this.onPhaseTimeout(phase), ms);
  }

  private clearPhaseTimeout() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private onPhaseTimeout(phase: WalletConnectErrorPhase) {
    const messages: Record<WalletConnectErrorPhase, string> = {
      pairing:
        'No wallet connected in time. Generate a fresh QR code and try again.',
      approving:
        'The wallet did not finish approving the session. Please try again.',
      signing:
        'The signature request timed out. Nothing was signed — you can retry.',
      relay: 'The WalletConnect relay stopped responding.',
    };
    console.warn(`[WalletConnect] ${phase} phase timed out after its budget`);
    this.failWith(new WalletConnectTimeoutError(phase, messages[phase]));
  }

  /**
   * Abort the session with a typed error: reject every in-flight request,
   * stop all timers, close the socket, and surface `error` to the UI.
   */
  private failWith(err: WalletConnectError) {
    // Set the terminal status first so pending-request wrappers do not bounce
    // the UI back to `connected` on their way out.
    this.currentStatus = 'error';
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(err);
      this.pendingRequests.delete(id);
    }
    this.intentionalClose = true;
    this.stopAllTimers();
    for (const topic of Array.from(this.topicExpiry.keys())) this.releaseTopic(topic);
    this.closeSocket();
    this.emit('error', err.message);
  }

  private stopAllTimers() {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.clearPhaseTimeout();
    this.stopTopicPurge();
    if (this.sessionExpiryTimer) {
      clearTimeout(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }
  }

  private closeSocket() {
    if (!this.ws) return;
    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onerror = null;
    this.ws.onclose = null;
    if (this.ws.readyState === 0 /* CONNECTING */ || this.ws.readyState === 1 /* OPEN */) {
      try {
        this.ws.close();
      } catch {
        /* noop */
      }
    }
    this.ws = null;
  }

  private async onWsMessage(raw: string) {
    // Proof of life — the relay answered something, so it is not dead.
    this.noteRelayActivity();

    let msg: WCRelayMessage;
    try {
      msg = JSON.parse(raw) as WCRelayMessage;
    } catch {
      return;
    }

    // Relay publish acknowledgement — nothing to do
    if (msg.result !== undefined && !msg.method) {
      const subscribedTopic = this.pendingSubscribes.get(msg.id);
      if (subscribedTopic !== undefined) {
        this.pendingSubscribes.delete(msg.id);
        // Only keep ids for topics that are still live — a late ack for a
        // topic purged in the meantime must not resurrect it.
        if (typeof msg.result === 'string' && this.topicExpiry.has(subscribedTopic)) {
          this.subscriptionIds.set(subscribedTopic, msg.result);
        }
        return;
      }
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        pending.resolve(msg.result);
        this.pendingRequests.delete(msg.id);
      }
      return;
    }

    if (msg.error) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        pending.reject(new Error(msg.error.message));
        this.pendingRequests.delete(msg.id);
      }
      return;
    }

    if (msg.method !== RELAY_SUBSCRIPTION) return;

    const subscriptionData = msg.params as {
      id: string;
      data: { topic: string; message: string; publishedAt: number };
    };

    const { topic, message: encMessage } = subscriptionData.data;

    // Traffic on a topic past its deadline is never processed; purge it now
    // instead of waiting for the next sweep.
    const now = Date.now();
    const topicDeadline = this.topicExpiry.get(topic);
    if (topicDeadline !== undefined && topicDeadline <= now) {
      this.purgeExpiredTopics(now);
      return;
    }

    // Determine which key to use for decryption
    let key: CryptoKey;
    if (topic === this.pairingTopic && this.pairingKey) {
      key = this.pairingKey;
    } else if (topic === this.sessionTopic && this.sessionKey) {
      key = this.sessionKey;
    } else {
      // Unknown topic — ignore
      return;
    }

    let decrypted: string;
    try {
      const envelope = JSON.parse(encMessage) as WCEncryptedEnvelope;
      const version = envelope.version ?? 0;
      if (!isEnvelopeFresh(envelope, now)) {
        console.warn('[WalletConnect] dropped stale or undated envelope on', topic === this.pairingTopic ? 'pairing topic' : 'session topic');
        return;
      }
      // Authenticate before recording the IV, so forged frames cannot fill
      // the history. AAD binds topic + version + ts (see envelopeAad).
      decrypted = await decrypt(envelope, key, topic);
      // Validate IV has not been reused with this key version
      if (!this.trackIv(topic, version, envelope.iv, envelope.ts)) {
        console.error('IV reuse detected on', topic === this.pairingTopic ? 'pairing topic' : 'session topic');
        return;
      }
    } catch {
      // Decryption failed — possibly a relay heartbeat or unrelated message
      return;
    }

    let payload: WCRelayMessage;
    try {
      payload = JSON.parse(decrypted) as WCRelayMessage;
    } catch {
      return;
    }

    await this.handleAppMessage(topic, payload);
  }

  // ── App-level message handling ──────────────────────────────────────────────

  private async handleAppMessage(topic: string, msg: WCRelayMessage) {
    const method = msg.method;

    if (method === METHOD_SESSION_PROPOSE) {
      await this.handleSessionProposal(topic, msg);
      return;
    }

    if (method === METHOD_SESSION_SETTLE) {
      this.handleSessionSettle(msg);
      return;
    }

    if (method === METHOD_SESSION_DELETE) {
      this.disconnect();
      return;
    }

    if (method === METHOD_SESSION_REQUEST) {
      // Responses to our outbound sign requests arrive here
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        if (msg.error) {
          pending.reject(new Error(msg.error.message));
        } else {
          pending.resolve(msg.result);
        }
        this.pendingRequests.delete(msg.id);
      }
      return;
    }
  }

  private async handleSessionProposal(
    _pairingTopic: string,
    msg: WCRelayMessage,
  ) {
    const proposal = msg.params as {
      id: number;
      proposer: { publicKey: string; metadata: WCPeerMetadata };
      relays: Array<{ protocol: string }>;
      requiredNamespaces: Record<string, unknown>;
      /** Unix seconds; WC v2 proposals are only valid until then. */
      expiryTimestamp?: number;
    };

    // An expired proposal must be rejected, never answered with a settle —
    // otherwise a captured proposal could be replayed to open a session.
    if (
      typeof proposal?.expiryTimestamp === 'number' &&
      proposal.expiryTimestamp * 1000 <= Date.now()
    ) {
      console.warn('[WalletConnect] rejected expired session proposal', proposal.id);
      this.failWith(
        new WalletConnectExpiredError(
          'The wallet sent an expired session proposal. Generate a fresh QR code and try again.',
          'pairing',
        ),
      );
      return;
    }

    this.emit('approving');
    // The wallet now has a bounded window to settle the session.
    this.setPhaseTimeout('approving', APPROVE_TIMEOUT_MS);

    // The pairing may be purged while we await crypto below; hold on to what
    // the acknowledgement needs.
    const pairingTopic = this.pairingTopic;
    const pairingKey = this.pairingKey;
    const pairingKeyVersion = this.pairingKeyVersion;
    if (!pairingKey) return;

    // Generate a new session topic + key with version 0. Until the wallet
    // settles, the approve phase timeout bounds it; after that, the expiry.
    const sessionExpiresAt = Date.now() + SESSION_TTL_MS;
    this.sessionTopic = randomHex(32);
    this.sessionExpiresAt = sessionExpiresAt;
    this.topicExpiry.set(this.sessionTopic, sessionExpiresAt);
    this.sessionKey = await generateSymKey();
    this.sessionKeyVersion = 0;
    const rawSessionKey = await exportRawKey(this.sessionKey);
    const sessionKeyHex = bytesToHex(rawSessionKey);
    this.sessionKeyHex = sessionKeyHex;

    // Subscribe to the session topic
    this.subscribe(this.sessionTopic);

    // Build the settle response: echo back the proposer's requested
    // namespaces with dummy accounts — the real accounts arrive in
    // wc_sessionSettle from the wallet.
    const settlePayload = {
      id: this.nextId(),
      jsonrpc: '2.0' as const,
      method: METHOD_SESSION_SETTLE,
      params: {
        relay: { protocol: 'irn' },
        controller: {
          publicKey: sessionKeyHex,
          metadata: {
            name: 'BettaPay',
            description: 'Non-custodial merchant payments',
            url: SITE_URL,
            icons: [],
          },
        },
        namespaces: {
          stellar: {
            accounts: [],
            methods: [METHOD_STELLAR_SIGN_TX, METHOD_STELLAR_SIGN_MSG],
            events: [],
            chains: [this.chainId],
          },
        },
        expiry: Math.floor(sessionExpiresAt / 1000),
        acknowledged: false,
        pairingTopic,
      },
    };

    // Send settle encrypted with the session key to the session topic
    await this.publishEncrypted(
      this.sessionTopic,
      this.sessionKey,
      this.sessionKeyVersion,
      JSON.stringify(settlePayload),
    );

    // Acknowledge the proposal on the pairing topic
    const ack = {
      id: proposal.id,
      jsonrpc: '2.0' as const,
      result: {
        relay: { protocol: 'irn' },
        responderPublicKey: sessionKeyHex,
      },
    };
    await this.publishEncrypted(
      pairingTopic,
      pairingKey,
      pairingKeyVersion,
      JSON.stringify(ack),
    );
  }

  private handleSessionSettle(msg: WCRelayMessage) {
    const settle = msg.params as {
      namespaces: {
        stellar?: {
          accounts: string[]; // "stellar:testnet:G..."
          chains?: string[];
        };
      };
      controller: { metadata: WCPeerMetadata };
      /** Unix seconds the wallet agrees the session lives until. */
      expiry?: number;
    };

    // The session is settling — the approve budget no longer applies.
    this.clearPhaseTimeout();

    // Never accept a settle that is already dead, and never let the wallet
    // stretch the session past the lifetime we advertised.
    const now = Date.now();
    const peerExpiryMs = typeof settle?.expiry === 'number' ? settle.expiry * 1000 : null;
    if (peerExpiryMs !== null && peerExpiryMs <= now) {
      this.failWith(
        new WalletConnectExpiredError(
          'The wallet settled a session that has already expired. Please try again.',
          'approving',
        ),
      );
      return;
    }
    const expiresAt = Math.min(peerExpiryMs ?? this.sessionExpiresAt, this.sessionExpiresAt);

    const stellarNS = settle?.namespaces?.stellar;
    const rawAccounts: string[] = stellarNS?.accounts ?? [];
    const reportedChains = Array.from(
      new Set(
        [
          ...(stellarNS?.chains ?? []).map((chain) => getStellarWalletConnectChain(chain)),
          ...rawAccounts
            .map((account) => getStellarChainFromAccount(account))
            .filter((chain): chain is StellarWalletConnectChainId => Boolean(chain)),
        ],
      ),
    );

    if (reportedChains.length === 0 || !reportedChains.includes(this.chainId)) {
      this.failWith(
        new WalletConnectNetworkMismatchError(this.chainId, reportedChains),
      );
      return;
    }

    const matchingAccounts = rawAccounts.filter((account) => {
      const accountChain = getStellarChainFromAccount(account);
      return !accountChain || accountChain === this.chainId;
    });

    const stellarAccounts = extractValidStellarAddresses(matchingAccounts);

    if (stellarAccounts.length === 0) {
      this.failWith(
        new WalletConnectError(
          'No Stellar accounts found in the WalletConnect session for the selected network.',
          'approving',
        ),
      );
      return;
    }

    // Extract and validate Stellar addresses from CAIP-2 format
    const session: WalletConnectSession = {
      topic: this.sessionTopic,
      peerMetadata: settle.controller?.metadata ?? {
        name: 'Unknown Wallet',
        description: '',
        url: '',
        icons: [],
      },
      stellarAccounts,
      address: stellarAccounts[0],
      sessionKey: this.sessionKeyHex,
      sessionKeyVersion: this.sessionKeyVersion,
      expiry: Math.floor(expiresAt / 1000),
    };

    // The pairing has done its job; release it instead of holding the
    // subscription open for the lifetime of the session.
    this.releaseTopic(this.pairingTopic);
    this.pairingTopic = '';
    this.pairingKey = null;
    this.pairingKeyVersion = 0;
    this.setSessionExpiry(expiresAt);

    this.emit('connected');
    this.sessionListener?.(session);
  }

  // ── Signing ─────────────────────────────────────────────────────────────────

  private async sendSessionRequest<T>(
    method: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    if (!this.sessionKey || !this.sessionTopic) {
      throw new WalletConnectError(
        'No active WalletConnect session.',
        'signing',
      );
    }
    this.emit('signing');
    // Auto-abort if the wallet never answers. `failWith` rejects the pending
    // promise below with a typed WalletConnectTimeoutError.
    this.setPhaseTimeout('signing', SIGN_TIMEOUT_MS);

    const id = this.nextId();
    const payload = {
      id,
      jsonrpc: '2.0' as const,
      method: METHOD_SESSION_REQUEST,
      params: {
        request: { method, params },
        chainId: this.chainId,
      },
    };

    return new Promise<T>((resolve, reject) => {
      const finish = (fn: () => void) => {
        this.clearPhaseTimeout();
        this.pendingRequests.delete(id);
        // Only step back to `connected` if we are still mid-signing; a failure
        // path has already moved us to `error`.
        if (this.currentStatus === 'signing') this.emit('connected');
        fn();
      };

      this.pendingRequests.set(id, {
        resolve: (v) => finish(() => resolve(v as T)),
        reject: (e) => finish(() => reject(e)),
      });

      this.publishEncrypted(
        this.sessionTopic,
        this.sessionKey!,
        this.sessionKeyVersion,
        JSON.stringify(payload),
      ).catch((e) => {
        const pending = this.pendingRequests.get(id);
        // A publish onto a silently severed socket must not leave the signer
        // hanging on a raw transport error — surface the typed timeout so the
        // UI recovers (issue #764).
        pending?.reject(
          e instanceof WalletConnectTimeoutError
            ? e
            : new WalletConnectTimeoutError(
                'signing',
                'Lost the connection to the wallet while waiting for the signature. Nothing was signed — please try again.',
              ),
        );
      });
    });
  }

  // ── Relay transport helpers ─────────────────────────────────────────────────

  private relayRpc(method: string, params: unknown): number {
    const msg: WCRelayMessage = {
      id: this.nextId(),
      jsonrpc: '2.0',
      method,
      params,
    };
    this.ws?.send(JSON.stringify(msg));
    return msg.id;
  }

  private subscribe(topic: string) {
    const id = this.relayRpc(RELAY_SUBSCRIBE, { topic });
    this.pendingSubscribes.set(id, topic);
  }

  // ── Topic lifecycle (issue #499) ────────────────────────────────────────────

  /**
   * Forget a topic entirely: unsubscribe on the relay (best effort — the
   * socket may already be gone) and drop its deadline, subscription id and IV
   * history so nothing about it outlives the topic.
   */
  private releaseTopic(topic: string) {
    if (!topic) return;
    if (this.ws && this.ws.readyState === 1 /* OPEN */) {
      const id = this.subscriptionIds.get(topic);
      try {
        this.relayRpc(RELAY_UNSUBSCRIBE, id ? { topic, id } : { topic });
      } catch {
        /* socket died under us — the relay drops its subscriptions with it */
      }
    }
    this.topicExpiry.delete(topic);
    this.subscriptionIds.delete(topic);
    this.usedIvs.delete(topic);
    for (const [rpcId, pendingTopic] of this.pendingSubscribes) {
      if (pendingTopic === topic) this.pendingSubscribes.delete(rpcId);
    }
  }

  private setSessionExpiry(expiresAt: number) {
    this.sessionExpiresAt = expiresAt;
    this.topicExpiry.set(this.sessionTopic, expiresAt);
    if (this.sessionExpiryTimer) clearTimeout(this.sessionExpiryTimer);
    // setTimeout overflows past ~24.8 days; the periodic purge covers longer.
    const delay = Math.min(Math.max(expiresAt - Date.now(), 0), 2 ** 31 - 1);
    this.sessionExpiryTimer = setTimeout(() => this.purgeExpiredTopics(), delay);
  }

  /**
   * Drop every topic past its deadline plus stale IV history. Runs on an
   * interval, on (re)connect, and whenever traffic arrives for a dead topic.
   */
  private purgeExpiredTopics(now: number = Date.now()) {
    for (const [topic, deadline] of this.topicExpiry) {
      if (deadline > now) continue;

      if (topic === this.sessionTopic) {
        console.info('[WalletConnect] session expired — releasing topic');
        this.releaseTopic(topic);
        // Tear down like a wallet-initiated delete so the store clears state.
        this.disconnect();
        return;
      }

      this.releaseTopic(topic);
      if (topic === this.pairingTopic) {
        this.pairingTopic = '';
        this.pairingKey = null;
        this.pairingKeyVersion = 0;
      }
    }

    for (const ivs of this.usedIvs.values()) {
      for (const [iv, ts] of ivs) {
        if (now - ts > ENVELOPE_MAX_AGE_MS) ivs.delete(iv);
      }
    }
  }

  private startTopicPurge() {
    this.stopTopicPurge();
    this.purgeTimer = setInterval(() => this.purgeExpiredTopics(), TOPIC_PURGE_INTERVAL_MS);
  }

  private stopTopicPurge() {
    if (this.purgeTimer) {
      clearInterval(this.purgeTimer);
      this.purgeTimer = null;
    }
  }

  private async publishEncrypted(
    topic: string,
    key: CryptoKey,
    version: number,
    plaintext: string,
  ): Promise<void> {
    const envelope = await encrypt(plaintext, key, topic, version);
    this.relayRpc(RELAY_PUBLISH, {
      topic,
      message: JSON.stringify(envelope),
      // Nothing we send is valid past the receiver's freshness window.
      ttl: Math.ceil(ENVELOPE_MAX_AGE_MS / 1000),
      tag: 0,
    });
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  /** Track and validate IV for a given topic and key version to detect reuse */
  private trackIv(topic: string, version: number, iv: string, ts: number): boolean {
    let ivs = this.usedIvs.get(topic);
    if (!ivs) {
      ivs = new Map();
      this.usedIvs.set(topic, ivs);
    }
    const key = `${version}:${iv}`;
    if (ivs.has(key)) {
      // IV reuse detected
      return false;
    }
    ivs.set(key, ts);
    return true;
  }

  private emit(status: WalletConnectStatus, detail?: string) {
    this.currentStatus = status;
    this.statusListener?.(status, detail);
  }

  private nextId(): number {
    return this.rpcId++;
  }

  private cleanup() {
    // Mark the teardown as ours so `onclose` does not kick off a reconnect.
    this.intentionalClose = true;
    this.stopAllTimers();
    // Unsubscribe while the socket is still open so the relay stops holding
    // (and queueing messages for) topics we will never read again.
    for (const topic of Array.from(this.topicExpiry.keys())) this.releaseTopic(topic);
    this.closeSocket();

    // Reject anything still in flight so callers are never left hanging.
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(
        new WalletConnectError('WalletConnect session was closed.', 'relay'),
      );
      this.pendingRequests.delete(id);
    }

    this.pairingTopic = '';
    this.pairingKey = null;
    this.pairingKeyVersion = 0;
    this.sessionTopic = '';
    this.sessionKey = null;
    this.sessionKeyVersion = 0;
    this.sessionKeyHex = '';
    this.sessionExpiresAt = 0;
    this.usedIvs.clear();
    this.topicExpiry.clear();
    this.subscriptionIds.clear();
    this.pendingSubscribes.clear();
    this.rpcId = 1;
    this.reconnectAttempts = 0;
    this.statusBeforeReconnect = null;
    this.wsUrl = '';
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

// One client instance per browser page — avoids multiple open WebSockets.
let _client: WalletConnectClient | null = null;

export function getWalletConnectClient(
  network?: StellarWalletConnectNetwork | string,
): WalletConnectClient {
  if (typeof window === 'undefined') {
    throw new Error('WalletConnectClient is only available in the browser');
  }
  if (_client) {
    if (network === undefined || _client.chainId === getStellarWalletConnectChain(network)) {
      return _client;
    }
    _client?.disconnect();
  }
  const chainId = getStellarWalletConnectChain(network);
  _client = new WalletConnectClient(undefined, chainId);
  return _client;
}

export function resetWalletConnectClient() {
  _client?.disconnect();
  _client = null;
}
