/* Recent searches, kept in this browser only (localStorage). Every access is guarded: storage can be blocked. */

const KEY = "recent-searches";
const MAX = 6;

export function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string" && v.trim() !== "").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): string[] {
  const q = query.trim().slice(0, 60);
  if (!q) return readRecentSearches();
  const next = [q, ...readRecentSearches().filter((v) => v.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: nothing to remember */
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
