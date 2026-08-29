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

/** CAIP-2 chain identifier for Stellar */
const STELLAR_CHAIN = 'stellar:testnet';

/** WalletConnect relay JSON-RPC method */
const RELAY_PUBLISH = 'irn_publish';
const RELAY_SUBSCRIBE = 'irn_subscribe';
const RELAY_SUBSCRIPTION = 'irn_subscription';

/** App-level WalletConnect methods */
const METHOD_SESSION_PROPOSE = 'wc_sessionPropose';
const METHOD_SESSION_SETTLE = 'wc_sessionSettle';
const METHOD_SESSION_REQUEST = 'wc_sessionRequest';
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletConnectSession {
  topic: string;
  peerMetadata: WCPeerMetadata;
  stellarAccounts: string[];
  /** Primary Stellar G-address derived from the session */
  address: string;
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

interface WCEncryptedEnvelope {
  /** Base64url-encoded ciphertext */
  message: string;
  /** Base64url-encoded 12-byte IV */
  iv: string;
  /** Base64url-encoded 32-byte raw symmetric key */
  symKey: string;
  /** Encryption type — 0 = AES-256-GCM */
  type: number;
  /** Key version/derivation counter */
  version: number;
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

async function encrypt(
  plaintext: string,
  key: CryptoKey,
  version: number,
): Promise<WCEncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const rawKey = await exportRawKey(key);
  return {
    message: toBase64url(new Uint8Array(cipherBuf)),
    iv: toBase64url(iv),
    symKey: toBase64url(rawKey),
    type: 0,
    version,
  };
}

async function decrypt(envelope: WCEncryptedEnvelope, key: CryptoKey): Promise<string> {
  const iv = fromBase64url(envelope.iv);
  const ciphertext = fromBase64url(envelope.message);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );
  return new TextDecoder().decode(plainBuf);
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

function randomHex(bytes: number): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
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
  private pendingRequests = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  /** Tracks used (version, iv) pairs per topic to detect IV reuse */
  private usedIvs = new Map<string, Set<string>>();
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
    this.cleanup();
    this.emit('connecting');

    // Generate a fresh pairing topic + symmetric key
    this.pairingTopic = randomHex(32);
    this.pairingKey = await generateSymKey();
    this.pairingKeyVersion = 0;
    const rawKey = await exportRawKey(this.pairingKey);

    // Build the wc: URI per WC v2 spec
    // wc:<topic>@2?relay-protocol=irn&symKey=<hex>&projectId=<id>
    const symKeyHex = Array.from(rawKey, (b) => b.toString(16).padStart(2, '0')).join('');
    const relayParam = encodeURIComponent(JSON.stringify({ protocol: 'irn' }));
    const uri =
      `wc:${this.pairingTopic}@2` +
      `?relay-protocol=irn` +
      `&symKey=${symKeyHex}` +
      (PROJECT_ID ? `&projectId=${PROJECT_ID}` : '');

    void relayParam; // kept for reference; encoded into QR URI above

    // Open relay WebSocket. From here on, an unexpected close triggers the
    // reconnect path rather than a permanent wedge.
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.wsUrl = `${RELAY_URL}?projectId=${PROJECT_ID}&ua=BettaPay%2F1.0`;
    this.openSocket();

    // The wallet has a bounded window to scan the QR and propose a session.
    this.setPhaseTimeout('pairing', PAIRING_TIMEOUT_MS);

    return uri;
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
    if (this.pairingTopic) {
      this.relayRpc(RELAY_SUBSCRIBE, { topic: this.pairingTopic });
    }
    if (this.sessionTopic) {
      this.relayRpc(RELAY_SUBSCRIBE, { topic: this.sessionTopic });
    }

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
    this.closeSocket();
    this.emit('error', err.message);
  }

  private stopAllTimers() {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.clearPhaseTimeout();
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

    // Determine which key to use for decryption
    let decrypted: string;
    try {
      if (topic === this.pairingTopic && this.pairingKey) {
        const envelope = JSON.parse(encMessage) as WCEncryptedEnvelope;
        const version = envelope.version ?? 0;
        // Validate IV has not been reused with this key version
        if (!this.trackIv(topic, version, envelope.iv)) {
          console.error('IV reuse detected on pairing topic');
          return;
        }
        decrypted = await decrypt(envelope, this.pairingKey);
      } else if (topic === this.sessionTopic && this.sessionKey) {
        const envelope = JSON.parse(encMessage) as WCEncryptedEnvelope;
        const version = envelope.version ?? 0;
        // Validate IV has not been reused with this key version
        if (!this.trackIv(topic, version, envelope.iv)) {
          console.error('IV reuse detected on session topic');
          return;
        }
        decrypted = await decrypt(envelope, this.sessionKey);
      } else {
        // Unknown topic — ignore
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
    this.emit('approving');
    // The wallet now has a bounded window to settle the session.
    this.setPhaseTimeout('approving', APPROVE_TIMEOUT_MS);

    const proposal = msg.params as {
      id: number;
      proposer: { publicKey: string; metadata: WCPeerMetadata };
      relays: Array<{ protocol: string }>;
      requiredNamespaces: Record<string, unknown>;
    };

    // Generate a new session topic + key with version 0
    this.sessionTopic = randomHex(32);
    this.sessionKey = await generateSymKey();
    this.sessionKeyVersion = 0;
    const rawSessionKey = await exportRawKey(this.sessionKey);
    const sessionKeyHex = Array.from(rawSessionKey, (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');

    // Subscribe to the session topic
    this.relayRpc(RELAY_SUBSCRIBE, { topic: this.sessionTopic });

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
            chains: [STELLAR_CHAIN],
          },
        },
        expiry: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        acknowledged: false,
        pairingTopic: this.pairingTopic,
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
      this.pairingTopic,
      this.pairingKey!,
      this.pairingKeyVersion,
      JSON.stringify(ack),
    );
  }

  private handleSessionSettle(msg: WCRelayMessage) {
    const settle = msg.params as {
      namespaces: {
        stellar?: {
          accounts: string[]; // "stellar:testnet:G..."
        };
      };
      controller: { metadata: WCPeerMetadata };
    };

    // The session is settling — the approve budget no longer applies.
    this.clearPhaseTimeout();

    const stellarNS = settle?.namespaces?.stellar;
    const rawAccounts: string[] = stellarNS?.accounts ?? [];

    // Extract and validate Stellar addresses from CAIP-2 format
    const stellarAccounts = extractValidStellarAddresses(rawAccounts);

    if (stellarAccounts.length === 0) {
      this.failWith(
        new WalletConnectError(
          'No Stellar accounts found in the WalletConnect session.',
          'approving',
        ),
      );
      return;
    }

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
    };

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
        chainId: STELLAR_CHAIN,
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
        pending?.reject(e instanceof Error ? e : new Error(String(e)));
      });
    });
  }

  // ── Relay transport helpers ─────────────────────────────────────────────────

  private relayRpc(method: string, params: unknown): void {
    const msg: WCRelayMessage = {
      id: this.nextId(),
      jsonrpc: '2.0',
      method,
      params,
    };
    this.ws?.send(JSON.stringify(msg));
  }

  private async publishEncrypted(
    topic: string,
    key: CryptoKey,
    version: number,
    plaintext: string,
  ): Promise<void> {
    const envelope = await encrypt(plaintext, key, version);
    this.relayRpc(RELAY_PUBLISH, {
      topic,
      message: JSON.stringify(envelope),
      ttl: 86400,
      tag: 0,
    });
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  /** Track and validate IV for a given topic and key version to detect reuse */
  private trackIv(topic: string, version: number, iv: string): boolean {
    const key = `${topic}:${version}`;
    if (!this.usedIvs.has(key)) {
      this.usedIvs.set(key, new Set());
    }
    const ivSet = this.usedIvs.get(key)!;
    if (ivSet.has(iv)) {
      // IV reuse detected
      return false;
    }
    ivSet.add(iv);
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
    this.usedIvs.clear();
    this.rpcId = 1;
    this.reconnectAttempts = 0;
    this.statusBeforeReconnect = null;
    this.wsUrl = '';
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

// One client instance per browser page — avoids multiple open WebSockets.
let _client: WalletConnectClient | null = null;

export function getWalletConnectClient(): WalletConnectClient {
  if (typeof window === 'undefined') {
    throw new Error('WalletConnectClient is only available in the browser');
  }
  if (!_client) _client = new WalletConnectClient();
  return _client;
}

export function resetWalletConnectClient() {
  _client?.disconnect();
  _client = null;
}
