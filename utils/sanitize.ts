const SEARCH_QUERY_MAX_LENGTH = 100;

export function trimInput(value: string): string {
  return value.trim();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeSearchQuery(query: string): string {
  return query.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}
