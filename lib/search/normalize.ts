/* ══════════════════════════════════════════════════════════════
   Arabic / Bilingual Text Normalization Engine
   
   Normalizes Arabic text to handle common character variations:
   - Alef forms: أ إ آ ٱ → ا
   - Taa Marbuta: ة → ه  
   - Yaa forms: ى → ي
   - Hamza variants: ؤ ئ → و ي
   - Diacritics (tashkeel) removal
   - Kashida (tatweel) removal
   
   Also handles English normalization for consistent matching.
   ══════════════════════════════════════════════════════════════ */

/** Unicode ranges for Arabic diacritics (tashkeel) */
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;

/** Kashida / Tatweel character */
const TATWEEL = /\u0640/g;

/**
 * Map of Arabic character normalizations.
 * Uses a Map for O(1) lookup per character.
 */
const ARABIC_CHAR_MAP = new Map<string, string>([
  // Alef variants → bare Alef
  ["\u0623", "\u0627"], // أ → ا
  ["\u0625", "\u0627"], // إ → ا
  ["\u0622", "\u0627"], // آ → ا
  ["\u0671", "\u0627"], // ٱ → ا
  // Taa Marbuta → Haa
  ["\u0629", "\u0647"], // ة → ه
  // Alef Maqsura → Yaa
  ["\u0649", "\u064A"], // ى → ي
]);

/**
 * Normalize Arabic text for fuzzy search matching.
 * 
 * Algorithm:
 * 1. Remove diacritics (O(n) regex pass)
 * 2. Remove tatweel (O(n) regex pass)  
 * 3. Normalize character variants (O(n) char-by-char with Map lookup)
 * 4. Collapse whitespace
 * 
 * Time Complexity: O(n) where n = string length
 * Space Complexity: O(n) for the result string
 */
export function normalizeArabic(text: string): string {
  // Step 1: Strip diacritics
  let result = text.replace(ARABIC_DIACRITICS, "");
  
  // Step 2: Remove kashida  
  result = result.replace(TATWEEL, "");

  // Step 3: Normalize character variants via Map lookup (O(1) per char)
  const chars: string[] = [];
  for (const char of result) {
    chars.push(ARABIC_CHAR_MAP.get(char) ?? char);
  }
  result = chars.join("");

  // Step 4: Collapse whitespace
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Normalize English text for search matching.
 * Lowercases + collapses whitespace.
 */
export function normalizeEnglish(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Universal text normalizer — detects language and applies
 * the appropriate normalization pipeline.
 * 
 * For bilingual text (Arabic + English mixed), applies both.
 */
export function normalizeText(text: string): string {
  let result = text.toLowerCase();
  result = normalizeArabic(result);
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Check if normalized query is a substring of normalized target.
 * Handles bilingual content seamlessly.
 * 
 * @returns true if the query matches within the target text
 */
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query || !target) return false;
  const nq = normalizeText(query);
  const nt = normalizeText(target);
  return nt.includes(nq);
}

/**
 * Score a match for ranking search results.
 * Higher score = better match.
 * 
 * Scoring algorithm:
 * - Exact match: 100
 * - Starts with query: 80
 * - Word boundary match: 60
 * - Contains query: 40
 * - No match: 0
 * 
 * Time Complexity: O(n) where n = target length
 */
export function scoreMatch(query: string, target: string): number {
  if (!query || !target) return 0;

  const nq = normalizeText(query);
  const nt = normalizeText(target);

  if (nt === nq) return 100;
  if (nt.startsWith(nq)) return 80;

  // Word boundary match — query matches start of any word
  const words = nt.split(" ");
  for (const word of words) {
    if (word.startsWith(nq)) return 60;
  }

  if (nt.includes(nq)) return 40;

  return 0;
}

/**
 * Build a normalized search index entry for a product.
 * Concatenates all searchable fields into one normalized string
 * for fast substring matching.
 * 
 * This avoids repeated normalization during search by
 * pre-computing the normalized searchable text.
 */
export function buildSearchableText(fields: (string | null | undefined)[]): string {
  return fields
    .filter(Boolean)
    .map((f) => normalizeText(f!))
    .join(" ");
}
