const handled = new Set<string>();

export function shouldHandleNotificationNav(messageId?: string): boolean {
  if (!messageId) return true;
  if (handled.has(messageId)) return false;
  handled.add(messageId);
  // expire after a minute to avoid memory growth during long sessions
  setTimeout(() => handled.delete(messageId), 60_000);
  return true;
}
