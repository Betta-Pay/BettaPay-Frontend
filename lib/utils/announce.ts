let announceTimer: ReturnType<typeof setTimeout> | null = null;
let innerTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;
let lastMessage = '';

export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('announcer');
  if (!el) return;

  // Coalesce identical messages — skip if the same text was just announced.
  if (message === lastMessage) return;

  // Clear any pending announce, inner, or clearance timers from the previous
  // call. The inner timer must be tracked too, otherwise a rapid follow-up call
  // can be overwritten by a stale message once its 100ms delay elapses (#1160).
  if (announceTimer) clearTimeout(announceTimer);
  if (innerTimer) clearTimeout(innerTimer);
  if (clearTimer) clearTimeout(clearTimer);

  el.setAttribute('aria-live', 'polite');

  // Single debounce: clear the region, then write the new message.
  announceTimer = setTimeout(() => {
    el.textContent = '';

    innerTimer = setTimeout(() => {
      el.textContent = message;
      innerTimer = null;

      // Clear the live region so a subsequent identical message can re-trigger.
      clearTimer = setTimeout(() => {
        el.textContent = '';
        // Reset the dedupe guard once the region is empty so the same message
        // can be announced again later (#1160).
        lastMessage = '';
        clearTimer = null;
      }, 1000);
    }, 100);
  }, 500);

  lastMessage = message;
}
