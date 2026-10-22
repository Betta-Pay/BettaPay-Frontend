"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight, ShieldAlert, TrendingUp, Wallet, BellDot } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Toggle,
} from '@/components/ui';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationItem,
  type NotificationPreferences,
  type NotificationType,
} from '@/lib/notifications';

interface NotificationCenterProps {
  unreadNotificationCount?: number;
  /** Unread admin alerts; counted in the badge and linked from the menu. */
  alertUnreadCount?: number;
}

const typeIcons: Record<NotificationType, typeof Bell> = {
  settlement: Wallet,
  webhook_failure: ShieldAlert,
  rate_alert: TrendingUp,
  kyc: BellDot,
};

async function fetchNotifications(): Promise<{ notifications: NotificationItem[]; preferences: NotificationPreferences; unreadCount: number }> {
  const response = await fetch('/api/notifications', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load notifications');
  }

  return response.json();
}

export function NotificationCenter({ unreadNotificationCount = 0, alertUnreadCount = 0 }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const payload = await fetchNotifications();
      setNotifications(payload.notifications ?? []);
      setPreferences(payload.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES);
      setHasFetched(true);
    } catch {
      // Silently fail; UI will show empty state and keep the bell available.
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));

    const tick = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const timer = window.setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const eventSource = new EventSource('/api/notifications/stream');
    eventSource.onmessage = () => {
      refresh();
    };

    return () => {
      eventSource.close();
    };
  }, [refresh]);

  const unreadCount = useMemo(() => {
    const localUnread = notifications.filter((notification) => !notification.read).length;
    if (hasFetched) {
      return localUnread + alertUnreadCount;
    }
    return Math.max(unreadNotificationCount, localUnread) + alertUnreadCount;
  }, [hasFetched, notifications, unreadNotificationCount, alertUnreadCount]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      await refresh();
    } catch {
      // Keep optimistic update on failure
    }
  }, [refresh]);

  const handleTogglePreference = useCallback(async (key: NotificationType) => {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPreferences);

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_preferences', preferences: nextPreferences }),
    });

    await refresh();
  }, [preferences, refresh]);

  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      await refresh();
    } catch {
      // Keep optimistic update on failure
    }
  }, [refresh]);

  const notificationLabel = unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={notificationLabel}
            className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl min-h-[44px] min-w-[44px]"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive border-2 border-background" aria-hidden="true" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[360px] border-border shadow-lg rounded-2xl p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-base font-semibold text-foreground">Notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator className="bg-muted" />

        {alertUnreadCount > 0 && (
          <Link
            href="/alerts"
            onClick={() => setOpen(false)}
            className="mx-2 mt-2 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
              {alertUnreadCount} unread platform alert{alertUnreadCount === 1 ? '' : 's'}
            </span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}

        <div className="max-h-[360px] overflow-y-auto px-2 py-2">
          {loading && notifications.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            notifications.slice(0, 6).map((notification) => {
              const Icon = typeIcons[notification.type];

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleMarkRead(notification.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${notification.read ? 'border-transparent bg-muted/30' : 'border-primary/20 bg-primary/5'}`}
                >
                  <div className="mt-0.5 rounded-lg bg-background p-2 text-foreground ring-1 ring-border">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {NOTIFICATION_TYPE_LABELS[notification.type]} · {new Date(notification.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="bg-muted" />

        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Preferences</p>
            <Link href="/notifications" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as NotificationType[]).map((key) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                <span className="text-xs text-foreground">{NOTIFICATION_TYPE_LABELS[key]}</span>
                <Toggle
                  checked={preferences[key]}
                  label={NOTIFICATION_TYPE_LABELS[key]}
                  aria-label={`Toggle ${NOTIFICATION_TYPE_LABELS[key]} notifications`}
                  onClick={() => handleTogglePreference(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  const refresh = useCallback(async () => {
    try {
      const payload = await fetchNotifications();
      setPreferences(payload.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES);
    } catch {
      // keep defaults when the request fails
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleTogglePreference = useCallback(async (key: NotificationType) => {
    const nextPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(nextPreferences);

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_preferences', preferences: nextPreferences }),
    });
  }, [preferences]);

  return (
    <div className="space-y-3">
      {(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as NotificationType[]).map((key) => (
        <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{NOTIFICATION_TYPE_LABELS[key]}</p>
            <p className="text-xs text-muted-foreground">{key === 'settlement' ? 'Settlement lifecycle updates' : key === 'webhook_failure' ? 'Webhook retries and delivery problems' : key === 'rate_alert' ? 'Rate movement warnings' : 'Customer or compliance updates'}</p>
          </div>
          <Toggle checked={preferences[key]} label={NOTIFICATION_TYPE_LABELS[key]} aria-label={`Toggle ${NOTIFICATION_TYPE_LABELS[key]} notifications`} onClick={() => handleTogglePreference(key)} />
        </div>
      ))}
    </div>
  );
}
