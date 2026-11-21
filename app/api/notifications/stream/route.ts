import { NextRequest, NextResponse } from 'next/server';
import { getNotificationStore, getUnreadCount } from '@/lib/notifications';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth/session';
import { isJwtExpiredOrInvalid } from '@/lib/utils/jwt';

export const dynamic = 'force-dynamic';

const NOTIFICATION_INTERVAL_MS = 15_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  if (isJwtExpiredOrInvalid(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let notificationTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const clearTimers = () => {
    if (notificationTimer !== undefined) {
      clearInterval(notificationTimer);
      notificationTimer = undefined;
    }
    if (heartbeatTimer !== undefined) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Client already disconnected. Stop timers so a later tick cannot
          // throw "Controller is already closed".
          closed = true;
          clearTimers();
        }
      };

      const pushNotifications = () => {
        const store = getNotificationStore();
        enqueue(
          `event: notification\ndata: ${JSON.stringify({
            notifications: store.notifications,
            unreadCount: getUnreadCount(store.notifications),
            preferences: store.preferences,
          })}\n\n`,
        );
      };

      const pushHeartbeat = () => {
        enqueue(': heartbeat\n\n');
      };

      const stop = () => {
        if (closed) return;
        closed = true;
        clearTimers();
        try {
          controller.close();
        } catch {
          // Controller is already closed.
        }
      };

      pushNotifications();
      notificationTimer = setInterval(pushNotifications, NOTIFICATION_INTERVAL_MS);
      heartbeatTimer = setInterval(pushHeartbeat, HEARTBEAT_INTERVAL_MS);

      if (request.signal.aborted) {
        stop();
        return;
      }

      request.signal.addEventListener('abort', stop, { once: true });
    },
    cancel() {
      closed = true;
      clearTimers();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
