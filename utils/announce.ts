export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('announcer');
  if (!el) return;
  el.textContent = '';
  // 100ms gives AT time to observe the cleared state before the new message.
  setTimeout(() => { el.textContent = message; }, 100);
}
