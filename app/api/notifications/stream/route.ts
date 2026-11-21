import { getUnreadCount } from '@/lib/notifications';
import { getNotificationStore } from '@/lib/notifications';
import { getCookieValue, AUTH_TOKEN_COOKIE } from '@/lib/auth/session';
import { isJwtExpiredOrInvalid } from '@/lib/utils/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authToken = getCookieValue(request.headers.get('cookie'), AUTH_TOKEN_COOKIE);
  if (isJwtExpiredOrInvalid(authToken)) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let abortHandler: (() => void) | undefined;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (interval !== undefined) clearInterval(interval);
    if (abortHandler) request.signal.removeEventListener('abort', abortHandler);
  };

  const stream = new ReadableStream({
    start(controller) {
      const push = () => {
        try {
          const store = getNotificationStore();
          controller.enqueue(
            encoder.encode(
              `event: notification\ndata: ${JSON.stringify({
                notifications: store.notifications,
                unreadCount: getUnreadCount(store.notifications),
                preferences: store.preferences,
              })}\n\n`,
            ),
          );
          return true;
        } catch {
          cleanup();
          return false;
        }
      };

      abortHandler = () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // The stream may already have been canceled by its reader.
        }
      };
      request.signal.addEventListener('abort', abortHandler, { once: true });

      if (request.signal.aborted) {
        abortHandler();
        return;
      }

      if (push()) interval = setInterval(push, 15000);
    },
    cancel() {
      cleanup();
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
