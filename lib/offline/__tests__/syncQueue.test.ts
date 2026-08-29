import {
  enqueueSyncRequest,
  getPendingSyncCount,
  triggerSync,
  watchSyncComplete,
  SYNC_TAGS,
} from '@/lib/offline/syncQueue';

// jsdom has neither IndexedDB nor a service worker, so these tests pin the
// graceful-degradation contract: the helpers resolve safely and never throw,
// and callers always receive a queue id they can correlate later.

describe('syncQueue (no IndexedDB / service worker)', () => {
  it('enqueues a request and returns an id even when storage is unavailable', async () => {
    const id = await enqueueSyncRequest({
      tag: SYNC_TAGS.paymentLink,
      url: 'https://api.example.com/api/payment-links',
      method: 'POST',
      headers: [['Content-Type', 'application/json']],
      body: JSON.stringify({ label: 'Consulting Retainer', currency: 'USDC' }),
    });

    expect(id).toMatch(new RegExp(`^${SYNC_TAGS.paymentLink}-`));
  });

  it('reports zero pending items when IndexedDB is unavailable', async () => {
    await expect(getPendingSyncCount()).resolves.toBe(0);
    await expect(getPendingSyncCount(SYNC_TAGS.webhookTest)).resolves.toBe(0);
  });

  it('triggerSync resolves without a service worker', async () => {
    await expect(triggerSync()).resolves.toBeUndefined();
  });

  it('watchSyncComplete returns a noop unsubscribe without a service worker', () => {
    const unsubscribe = watchSyncComplete(() => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});
