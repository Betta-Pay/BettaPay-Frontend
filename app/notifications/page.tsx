"use client";

import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, ShieldAlert, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui';
import { NotificationPreferencesPanel } from '@/components/notifications/NotificationCenter';
import { NOTIFICATION_TYPE_LABELS, type NotificationItem, type NotificationType } from '@/lib/notifications';
import { useNotify } from '@/lib/hooks/useNotify';

const typeIcons: Record<NotificationType, typeof Bell> = {
  settlement: Wallet,
  webhook_failure: ShieldAlert,
  rate_alert: TrendingUp,
  kyc: Bell,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const notify = useNotify();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const payload = await response.json();
      setNotifications(payload.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleMarkAllRead = useCallback(async () => {
    let previousSnapshot: NotificationItem[] = [];
    setActionError(null);
    setNotifications((current) => {
      previousSnapshot = current;
      return current.map((item) => ({ ...item, read: true }));
    });

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
    } catch {
      setNotifications(previousSnapshot);
      const message = 'Failed to mark all notifications as read. Changes have been reverted.';
      setActionError(message);
      notify.error(message);
    }
  }, [notify]);

  const handleMarkRead = useCallback(async (id: string) => {
    let previousSnapshot: NotificationItem[] = [];
    setActionError(null);
    setNotifications((current) => {
      previousSnapshot = current;
      return current.map((item) => (item.id === id ? { ...item, read: true } : item));
    });

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    } catch {
      setNotifications(previousSnapshot);
      const message = 'Failed to update notification read status.';
      setActionError(message);
      notify.error(message);
    }
  }, [notify]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Center</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Notifications</h1>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={handleMarkAllRead}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {actionError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Your inbox is empty.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type];

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleMarkRead(notification.id)}
                    className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors ${notification.read ? 'border-border bg-muted/20' : 'border-primary/20 bg-primary/5'}`}
                  >
                    <div className="rounded-lg border border-border bg-background p-2 text-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                        {!notification.read && <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        <span>{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
                        <span>•</span>
                        <span>{new Date(notification.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Event preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose which updates generate notifications.</p>
          <div className="mt-5">
            <NotificationPreferencesPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
