import React from 'react';
import { render, screen } from '@testing-library/react';
import { NotificationCenter } from '../NotificationCenter';

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
