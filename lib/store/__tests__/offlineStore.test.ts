import {
  useOfflineStore,
  OFFLINE_QUEUE_STORAGE_KEY,
  type QueuedMutation,
} from '../offlineStore';

describe('useOfflineStore — offline mutation replay queue (#901)', () => {
  beforeEach(() => {
    localStorage.clear();
    useOfflineStore.getState().setMutationExecutor(null);
    useOfflineStore.getState().clearMutations();
    useOfflineStore.setState({
      isOnline: true,
      isApiReachable: true,
      dismissed: false,
      isReplaying: false,
    });
  });

  it('queues pending mutations while offline and persists them to storage', () => {
    useOfflineStore.getState().setIsOnline(false);

    const queued = useOfflineStore.getState().enqueueMutation({
      url: '/api/merchant/settings',
      method: 'PATCH',
      body: { displayName: 'Acme Global' },
    });

    expect(queued.id).toBeDefined();
    expect(useOfflineStore.getState().pendingMutations).toHaveLength(1);

    const persistedRaw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    expect(persistedRaw).not.toBeNull();
    const persisted = JSON.parse(persistedRaw!) as QueuedMutation[];
    expect(persisted).toHaveLength(1);
    expect(persisted[0].url).toBe('/api/merchant/settings');
    expect(persisted[0].body).toEqual({ displayName: 'Acme Global' });
  });

  it('replays queued mutations sequentially in FIFO order when online connectivity resumes', async () => {
    const executionOrder: string[] = [];
    useOfflineStore.getState().setMutationExecutor(async (mutation) => {
      executionOrder.push(`${mutation.method}:${mutation.url}`);
      return { ok: true };
    });

    useOfflineStore.getState().setIsOnline(false);
    useOfflineStore.getState().enqueueMutation({
      id: 'm1',
      url: '/api/merchant/profile',
      method: 'PATCH',
      body: { step: 1 },
      createdAt: 1000,
    });
    useOfflineStore.getState().enqueueMutation({
      id: 'm2',
      url: '/api/merchant/webhooks',
      method: 'POST',
      body: { step: 2 },
      createdAt: 2000,
    });
    useOfflineStore.getState().enqueueMutation({
      id: 'm3',
      url: '/api/merchant/notifications',
      method: 'PUT',
      body: { step: 3 },
      createdAt: 3000,
    });

    const result = await useOfflineStore.getState().replayQueuedMutations();
    expect(result).toEqual({ replayed: 3, remaining: 0 });
    expect(executionOrder).toEqual([
      'PATCH:/api/merchant/profile',
      'POST:/api/merchant/webhooks',
      'PUT:/api/merchant/notifications',
    ]);
    expect(useOfflineStore.getState().pendingMutations).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)!)).toEqual([]);
  });

  it('stops sequential replay on first failure and preserves remaining queue order', async () => {
    const executedIds: string[] = [];
    useOfflineStore.getState().setMutationExecutor(async (mutation) => {
      executedIds.push(mutation.id);
      if (mutation.id === 'm2') {
        throw new Error('Network still unstable');
      }
      return { ok: true };
    });

    useOfflineStore.getState().setIsOnline(false);
    useOfflineStore.getState().enqueueMutation({
      id: 'm1',
      url: '/api/step1',
      method: 'POST',
    });
    useOfflineStore.getState().enqueueMutation({
      id: 'm2',
      url: '/api/step2',
      method: 'POST',
    });
    useOfflineStore.getState().enqueueMutation({
      id: 'm3',
      url: '/api/step3',
      method: 'POST',
    });

    const result = await useOfflineStore.getState().replayQueuedMutations();
    expect(result).toEqual({ replayed: 1, remaining: 2 });
    expect(executedIds).toEqual(['m1', 'm2']);

    const remaining = useOfflineStore.getState().pendingMutations;
    expect(remaining.map((m) => m.id)).toEqual(['m2', 'm3']);
    expect(remaining[0].retries).toBe(1);
  });

  it('automatically drains the queue when window online event fires', async () => {
    const replayedUrls: string[] = [];
    useOfflineStore.getState().setMutationExecutor(async (mutation) => {
      replayedUrls.push(mutation.url);
    });

    useOfflineStore.getState().setIsOnline(false);
    useOfflineStore.getState().enqueueMutation({
      url: '/api/drafts/save',
      method: 'PUT',
      body: { draft: true },
    });

    window.dispatchEvent(new Event('online'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(useOfflineStore.getState().isOnline).toBe(true);
    expect(replayedUrls).toEqual(['/api/drafts/save']);
    expect(useOfflineStore.getState().pendingMutations).toHaveLength(0);
  });
});
