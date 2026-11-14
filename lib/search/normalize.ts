/* ══════════════════════════════════════════════════════════════
   Search text normalisation (client-safe, pure)
   ──────────────────────────────────────────────────────────────
   normalizeSearch() mirrors the database's normalize_ar()
   (supabase/migrations/20261114020000_search.sql) so text matched
   in the browser or on the server behaves exactly like the
   product search:
     • lowercase
     • tashkeel and tatweel removed
     • أ إ آ ٱ → ا · ة → ه · ى → ي · ؤ → و · ئ → ي
     • Persian ی → ي and ک → ك (keyboards often type them)
     • Arabic-Indic and Persian digits → 0–9
     • punctuation and whitespace runs → one space
   tokenMatchLevel() mirrors the token rules of
   search_product_base(): word prefix (3), typo (2), inside a
   word (1).
   ══════════════════════════════════════════════════════════════ */

/** Harakat, superscript alef, Quranic marks and tatweel. */
const TASHKEEL = /[ً-ٰٟۖ-ۭـ]/g;

const CHAR_MAP: Record<string, string> = {
  "أ": "ا", // أ → ا
  "إ": "ا", // إ → ا
  "آ": "ا", // آ → ا
  "ٱ": "ا", // ٱ → ا
  "ة": "ه", // ة → ه
  "ى": "ي", // ى → ي
  "ؤ": "و", // ؤ → و
  "ئ": "ي", // ئ → ي
  "ی": "ي", // ی → ي
  "ک": "ك", // ک → ك
};
for (let d = 0; d <= 9; d++) {
  CHAR_MAP[String.fromCharCode(0x0660 + d)] = String(d); // ٠–٩
  CHAR_MAP[String.fromCharCode(0x06f0 + d)] = String(d); // ۰–۹
}
const MAPPED_CHARS = new RegExp(`[${Object.keys(CHAR_MAP).join("")}]`, "g");

/** Whitespace, ASCII / Latin-1 punctuation, general punctuation, Arabic punctuation. */
const SEPARATORS =
  /[\u0001-/:-@[-`{-¿×÷ -⁯،؛؟٪-٭۔﴾﴿]+/g;

/** Arabic definite article (with و/ب/ك/ف, and لل) ignored when comparing words. */
const ARABIC_ARTICLE = /^(وال|بال|كال|فال|ال|لل)/;

const charLength = (s: string) => Array.from(s).length;

/** Same output as the database's normalize_ar(). */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(TASHKEEL, "")
    .replace(MAPPED_CHARS, (c) => CHAR_MAP[c] ?? c)
    .replace(SEPARATORS, " ")
    .trim();
}

/** Distinct normalised words of a query (at most 8, like the database). */
export function searchTokens(text: string): string[] {
  return Array.from(new Set(normalizeSearch(text).split(" ").filter(Boolean))).slice(0, 8);
}

/** Drops a leading Arabic article from words longer than four letters. */
export function stripArticle(word: string): string {
  return charLength(word) > 4 ? word.replace(ARABIC_ARTICLE, "") : word;
}

/** Optimal string alignment distance: edits plus adjacent swaps ("shrit" → "shirt" = 1). */
export function editDistance(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  if (x.length === 0) return y.length;
  if (y.length === 0) return x.length;
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) =>
    Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
        v = Math.min(v, d[i - 2][j - 2] + 1);
      }
      d[i][j] = v;
    }
  }
  return d[x.length][y.length];
}

/** Allowed typos for a token: none under 4 letters, 1 up to 6, 2 from 7. */
export function typoBudget(token: string): number {
  const n = charLength(token);
  return n < 4 ? 0 : n >= 7 ? 2 : 1;
}

/**
 * How well one normalised query token matches one normalised word:
 * 3 = the word (or its plural form) starts with it, 2 = typo,
 * 1 = inside the word (3+ letters), 0 = no match.
 */
export function tokenMatchLevel(token: string, word: string): 0 | 1 | 2 | 3 {
  if (!token || !word) return 0;
  const ts = stripArticle(token);
  const ws = stripArticle(word);
  if (word.startsWith(token) || ws.startsWith(ts)) return 3;
  if (charLength(token) > 3 && (token === `${word}s` || token === `${word}es`)) return 3;
  const budget = typoBudget(ts);
  if (budget > 0 && Math.abs(charLength(ws) - charLength(ts)) <= budget && editDistance(ts, ws) <= budget) return 2;
  if (charLength(token) >= 3 && word.includes(token)) return 1;
  return 0;
}

/**
 * Relevance of a text for a query, using the database's tiers:
 * 5 exact, 4 starts with the query, else the weakest token level
 * (3 word, 2 typo, 1 inside a word); 0 when a token is missing.
 */
export function textMatchLevel(query: string, text: string): number {
  const q = normalizeSearch(query);
  const target = normalizeSearch(text);
  if (!q || !target) return 0;
  if (target === q) return 5;
  if (target.startsWith(q)) return 4;
  const words = target.split(" ");
  let weakest = 3;
  for (const token of searchTokens(q)) {
    let best = 0;
    for (const word of words) {
      best = Math.max(best, tokenMatchLevel(token, word));
      if (best === 3) break;
    }
    if (best === 0) return 0;
    weakest = Math.min(weakest, best);
  }
  return weakest;
}

/* ── Older helpers (kept for existing callers) ─────────────────── */

/** Arabic-only normalisation (no lowercase, punctuation kept). */
export function normalizeArabic(text: string): string {
  return text
    .replace(TASHKEEL, "")
    .replace(MAPPED_CHARS, (c) => CHAR_MAP[c] ?? c)
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercases and collapses whitespace. */
export function normalizeEnglish(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Bilingual normaliser; same as normalizeSearch(). */
export function normalizeText(text: string): string {
  return normalizeSearch(text);
}

/** True when the normalised query appears inside the normalised target. */
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query || !target) return false;
  return normalizeSearch(target).includes(normalizeSearch(query));
}

/** 100 exact, 80 prefix, 60 word prefix, 40 contains, 0 none. */
export function scoreMatch(query: string, target: string): number {
  if (!query || !target) return 0;
  const nq = normalizeSearch(query);
  const nt = normalizeSearch(target);
  if (nt === nq) return 100;
  if (nt.startsWith(nq)) return 80;
  if (nt.split(" ").some((w) => w.startsWith(nq))) return 60;
  if (nt.includes(nq)) return 40;
  return 0;
}

/** Joins and normalises several fields into one searchable string. */
export function buildSearchableText(fields: (string | null | undefined)[]): string {
  return fields
    .filter((f): f is string => Boolean(f))
    .map(normalizeSearch)
    .join(" ");
}

/**
 * Makes a user-typed search term safe to embed in a PostgREST
 * `or(...ilike...)` filter: characters that separate or group
 * filter expressions (`,` `(` `)`), quoting/escape characters and
 * LIKE wildcards are replaced with spaces, and the length is capped.
 */
export function toSafeLikeTerm(raw: string, maxLength = 100): string {
  return raw
    .replace(/[,()"'\%*_:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Trims and caps a raw query the way the search endpoints accept it. */
export function cleanQuery(raw: string | null | undefined, maxLength = 60): string {
  return (raw ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}
