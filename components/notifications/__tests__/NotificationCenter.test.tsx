import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { NotificationCenter } from '../NotificationCenter';
import { CSRF_HEADER_NAME } from '@/lib/utils/csrf';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationItem } from '@/lib/notifications';

// The dropdown is Base UI chrome; this suite exercises NotificationCenter's
// data flow, so the panel is rendered inline instead of behind an open menu.
// (Opening the real menu throws today: `DropdownMenuLabel` renders
// `Menu.GroupLabel` without a `Menu.Group` ancestor — pre-existing on develop,
// unrelated to #1134, and reported rather than fixed here.)
jest.mock('@/components/ui/dropdown-menu', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactLocal = require('react');
  const passThrough = (props: { children?: React.ReactNode }) =>
    ReactLocal.createElement(ReactLocal.Fragment, null, props.children);
  return {
    __esModule: true,
    DropdownMenu: passThrough,
    DropdownMenuContent: passThrough,
    DropdownMenuLabel: passThrough,
    DropdownMenuSeparator: () => null,
    DropdownMenuTrigger: (props: { render?: React.ReactNode }) => props.render ?? null,
  };
});

describe('NotificationCenter (#506)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('renders notification bell and shows unread badge when unread notifications exist', async () => {
    const mockNotifications = [
      { id: '1', type: 'settlement', title: 'Payment received', body: '$100 XLM', read: false, createdAt: new Date().toISOString() },
    ];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/notifications') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            notifications: mockNotifications,
            preferences: {},
            unreadCount: 1,
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    render(<NotificationCenter unreadNotificationCount={1} />);

    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toBeInTheDocument();
  });
});

// ── #1134: named SSE events + CSRF header on mutations ──────────────────────

/**
 * jsdom has no EventSource, and the passive stub in `jest.setup.js` records
 * nothing. This one keeps the registrations, so a test can deliver a real
 * `event: notification` frame and see what cleanup does with the listener.
 */
class RecordingEventSource {
  static instances: RecordingEventSource[] = [];

  url: string;
  closed = false;
  private listeners = new Map<string, Set<(event: Event) => void>>();

  constructor(url: string) {
    this.url = url;
    RecordingEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: Event) => void): void {
    const handlers = this.listeners.get(type) ?? new Set();
    handlers.add(handler);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type: string, handler: (event: Event) => void): void {
    this.listeners.get(type)?.delete(handler);
  }

  close(): void {
    this.closed = true;
  }

  handlerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  /** Deliver a named SSE frame the way a real stream would. */
  emit(type: string): void {
    for (const handler of Array.from(this.listeners.get(type) ?? [])) {
      handler(new Event(type));
    }
  }
}

type PatchCall = { action: string; headers: Record<string, string> };

/**
 * Serves `/api/notifications` from a mutable list, so a test can decide what
 * the next GET returns, and records every PATCH (action + headers).
 */
function installFakeApi(getNotifications: () => NotificationItem[]) {
  const patchCalls: PatchCall[] = [];

  RecordingEventSource.instances = [];
  Object.defineProperty(globalThis, 'EventSource', {
    configurable: true,
    writable: true,
    value: RecordingEventSource,
  });

  global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url !== '/api/notifications') {
      throw new Error(`Unexpected fetch: ${url}`);
    }

    if ((init?.method ?? 'GET').toUpperCase() === 'GET') {
      const notifications = getNotifications();
      return {
        ok: true,
        status: 200,
        json: async () => ({
          notifications,
          preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
          unreadCount: notifications.filter((n) => !n.read).length,
        }),
      };
    }

    const body = JSON.parse(String(init?.body)) as { action?: string };
    patchCalls.push({
      action: String(body.action),
      headers: { ...(init?.headers as Record<string, string> | undefined) },
    });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }) as unknown as typeof fetch;

  return { patchCalls };
}

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'n-1',
    type: 'settlement',
    title: 'Payment received',
    body: '$100 XLM',
    read: false,
    createdAt: new Date('2026-11-01T10:00:00.000Z').toISOString(),
    source: 'payment',
    dedupeKey: 'payment:n-1',
    ...overrides,
  };
}

const CSRF_TOKEN = 'a'.repeat(64);

function clearCsrfCookie() {
  document.cookie = 'csrf_token=; path=/; max-age=0';
}

describe('NotificationCenter realtime stream (#1134)', () => {
  let serverNotifications: NotificationItem[];
  let api: { patchCalls: PatchCall[] };

  beforeEach(() => {
    serverNotifications = [];
    api = installFakeApi(() => serverNotifications);
    clearCsrfCookie();
  });

  it('subscribes to the named "notification" event on the stream', () => {
    render(<NotificationCenter />);

    const [stream] = RecordingEventSource.instances;
    expect(stream).toBeDefined();
    expect(stream.url).toBe('/api/notifications/stream');
    expect(stream.handlerCount('notification')).toBe(1);
  });

  it('updates the unread badge and the list when a named notification arrives', async () => {
    render(<NotificationCenter unreadNotificationCount={0} />);

    // Nothing unread yet, so the bell carries no count.
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('Payment received')).not.toBeInTheDocument();

    // The server pushes a frame; the badge and list must follow it immediately,
    // without waiting for the 15s poll.
    serverNotifications = [makeNotification()];
    const [stream] = RecordingEventSource.instances;
    act(() => {
      stream.emit('notification');
    });

    expect(
      await screen.findByRole('button', { name: 'Notifications (1 unread)' })
    ).toBeInTheDocument();
    expect(await screen.findByText('Payment received')).toBeInTheDocument();
  });

  it('removes the listener and closes the stream on unmount', () => {
    const { unmount } = render(<NotificationCenter />);
    const [stream] = RecordingEventSource.instances;
    expect(stream.handlerCount('notification')).toBe(1);

    unmount();

    expect(stream.closed).toBe(true);
    expect(stream.handlerCount('notification')).toBe(0);
  });

  it('sends the CSRF header on mark-all-read and mark-read mutations', async () => {
    document.cookie = `csrf_token=${CSRF_TOKEN}`;
    serverNotifications = [makeNotification()];

    render(<NotificationCenter />);
    await screen.findByRole('button', { name: 'Notifications (1 unread)' });

    await act(async () => {
      screen.getByRole('button', { name: /mark all read/i }).click();
    });
    // Each mutation is followed by a refresh GET, which re-renders the row into
    // its read state; target it by what it says once marked read is registered.
    await waitFor(() =>
      expect(api.patchCalls.map((call) => call.action)).toContain('mark_all_read')
    );

    const row = await screen.findByRole('button', { name: /payment received/i });
    await act(async () => {
      row.click();
    });
    await waitFor(() => expect(api.patchCalls.map((call) => call.action)).toContain('mark_read'));

    expect(api.patchCalls).toHaveLength(2);
    for (const call of api.patchCalls) {
      expect(call.headers[CSRF_HEADER_NAME]).toBe(CSRF_TOKEN);
    }
  });

  it('sends the CSRF header when a preference is toggled', async () => {
    document.cookie = `csrf_token=${CSRF_TOKEN}`;

    render(<NotificationCenter />);

    await act(async () => {
      screen
        .getByRole('switch', { name: 'Toggle Settlement notifications' })
        .click();
    });

    await waitFor(() => expect(api.patchCalls).toHaveLength(1));
    expect(api.patchCalls[0].action).toBe('set_preferences');
    expect(api.patchCalls[0].headers[CSRF_HEADER_NAME]).toBe(CSRF_TOKEN);
  });

  it('omits the CSRF header when no token cookie is readable', async () => {
    serverNotifications = [makeNotification()];

    render(<NotificationCenter />);
    await screen.findByRole('button', { name: 'Notifications (1 unread)' });

    await act(async () => {
      screen.getByRole('button', { name: /mark all read/i }).click();
    });

    await waitFor(() => expect(api.patchCalls.length).toBeGreaterThan(0));
    for (const call of api.patchCalls) {
      expect(call.headers).not.toHaveProperty(CSRF_HEADER_NAME);
    }
  });
});
