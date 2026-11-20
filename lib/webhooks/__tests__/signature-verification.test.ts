/**
 * @jest-environment ./lib/webhooks/jest-node-env.js
 */
import {
  canonicalSignatureInput,
  constantTimeEqual,
  hmacSha256Hex,
  normalizeSignature,
  signPayload,
  verifyWebhookSignature,
} from '../hmac';

const SECRET = 'whsec_test_secret123';
const TIMESTAMP = '1700000000';
const PAYLOAD = '{"id":"evt_1","type":"payment.completed","data":{"amountUsdc":25}}';

describe('canonical webhook signatures', () => {
  it('signs `${timestamp}.${rawBody}`, not the body alone', async () => {
    const expected = await hmacSha256Hex(SECRET, `${TIMESTAMP}.${PAYLOAD}`);

    expect(await signPayload(SECRET, TIMESTAMP, PAYLOAD)).toBe(expected);
    expect(canonicalSignatureInput(TIMESTAMP, PAYLOAD)).toBe(`${TIMESTAMP}.${PAYLOAD}`);
  });

  it('verifies a correct signature with the sha256= prefix', async () => {
    const signature = `sha256=${await signPayload(SECRET, TIMESTAMP, PAYLOAD)}`;

    const result = await verifyWebhookSignature({
      secret: SECRET,
      timestamp: TIMESTAMP,
      payload: PAYLOAD,
      signature,
    });

    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.computedSignature).toBe(signature);
    expect(result.providedSignature).toBe(signature);
    expect(result.firstMismatchIndex).toBeNull();
  });

  it('accepts a bare hex signature, mixed case and surrounding whitespace', async () => {
    const hex = await signPayload(SECRET, TIMESTAMP, PAYLOAD);
    const signature = `  SHA256=${hex.toUpperCase()}  `;

    const result = await verifyWebhookSignature({
      secret: SECRET,
      timestamp: TIMESTAMP,
      payload: PAYLOAD,
      signature,
    });

    expect(result.valid).toBe(true);
    expect(normalizeSignature(signature)).toBe(hex);
  });

  it('rejects a tampered payload and points at the first differing character', async () => {
    const signature = `sha256=${await signPayload(SECRET, TIMESTAMP, PAYLOAD)}`;
    const tampered = PAYLOAD.replace('"amountUsdc":25', '"amountUsdc":2500');

    const result = await verifyWebhookSignature({
      secret: SECRET,
      timestamp: TIMESTAMP,
      payload: tampered,
      signature,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/does not match/i);
    expect(result.firstMismatchIndex).toEqual(expect.any(Number));
    expect(result.computedSignature).not.toBe(result.providedSignature);
  });

  it('rejects a replayed signature when the timestamp changes', async () => {
    const signature = `sha256=${await signPayload(SECRET, TIMESTAMP, PAYLOAD)}`;

    const result = await verifyWebhookSignature({
      secret: SECRET,
      timestamp: '1700000001',
      payload: PAYLOAD,
      signature,
    });

    expect(result.valid).toBe(false);
    expect(result.canonical).toBe(`1700000001.${PAYLOAD}`);
  });

  it('treats empty and malformed payloads as opaque HMAC input', async () => {
    for (const payload of ['', 'not-json{', '   ']) {
      const signature = `sha256=${await signPayload(SECRET, TIMESTAMP, payload)}`;
      const result = await verifyWebhookSignature({
        secret: SECRET,
        timestamp: TIMESTAMP,
        payload,
        signature,
      });

      expect(result.valid).toBe(true);
      expect(result.canonical).toBe(`${TIMESTAMP}.${payload}`);
    }
  });

  it('reports missing secret, timestamp or signature without throwing', async () => {
    const signature = `sha256=${await signPayload(SECRET, TIMESTAMP, PAYLOAD)}`;

    await expect(
      verifyWebhookSignature({ secret: '', timestamp: TIMESTAMP, payload: PAYLOAD, signature }),
    ).resolves.toMatchObject({ valid: false, reason: 'Missing signing secret.' });

    await expect(
      verifyWebhookSignature({ secret: SECRET, timestamp: '', payload: PAYLOAD, signature }),
    ).resolves.toMatchObject({ valid: false, reason: 'Missing timestamp.' });

    await expect(
      verifyWebhookSignature({ secret: SECRET, timestamp: TIMESTAMP, payload: PAYLOAD, signature: '   ' }),
    ).resolves.toMatchObject({ valid: false, reason: 'Missing signature header.' });
  });
});

describe('constantTimeEqual', () => {
  it('returns true only for identical strings', () => {
    expect(constantTimeEqual('', '')).toBe(true);
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
    expect(constantTimeEqual('', 'a')).toBe(false);
  });

  it('handles multi-byte characters without leaking an early length exit', () => {
    expect(constantTimeEqual('é', 'é')).toBe(true);
    expect(constantTimeEqual('é', 'e')).toBe(false);
  });
});
