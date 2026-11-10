import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationsPage from '../page';

const mockNotifyError = jest.fn();

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: jest.fn(),
    error: mockNotifyError,
    info: jest.fn(),
  }),
}));

jest.mock('@/components/notifications/NotificationCenter', () => ({
  NotificationPreferencesPanel: () => <div data-testid="prefs-panel" />,
}));

const initialNotifications = [
  {
    id: 'notif_1',
    type: 'settlement',
    title: 'Settlement completed',
    body: 'USDC payout processed.',
    read: false,
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'notif_2',
    type: 'webhook_failure',
    title: 'Webhook retry scheduled',
    body: 'Endpoint timed out.',
    read: false,
    createdAt: '2026-03-01T11:00:00.000Z',
  },
];

describe('NotificationsPage optimistic mark-all-read (#936)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('optimistically marks all notifications as read immediately before PATCH resolves', async () => {
    let resolvePatch!: (value: unknown) => void;
    const patchPromise = new Promise((resolve) => {
      resolvePatch = resolve;
    });

    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return patchPromise;
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ notifications: initialNotifications }),
      });
    }) as jest.Mock;

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Settlement completed')).toBeInTheDocument();
    });

    const firstItemButton = screen.getByText('Settlement completed').closest('button')!;
    expect(firstItemButton.className).toContain('bg-primary/5');

    fireEvent.click(screen.getByRole('button', { name: /Mark all read/i }));

    // Optimistic state update happens immediately before PATCH resolves
    expect(firstItemButton.className).toContain('bg-muted/20');

    resolvePatch({ ok: true, json: async () => ({}) });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  it('rolls back optimistic read state and shows an error toast when PATCH fails', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ notifications: initialNotifications }),
      });
    }) as jest.Mock;

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Settlement completed')).toBeInTheDocument();
    });

    const firstItemButton = screen.getByText('Settlement completed').closest('button')!;
    expect(firstItemButton.className).toContain('bg-primary/5');

    fireEvent.click(screen.getByRole('button', { name: /Mark all read/i }));

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to mark all notifications as read/i),
      );
    });

    // State rolled back to unread
    expect(firstItemButton.className).toContain('bg-primary/5');
    expect(screen.getByRole('alert')).toHaveTextContent(/Failed to mark all notifications as read/i);
  });
});
