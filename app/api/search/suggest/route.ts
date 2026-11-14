/* ══════════════════════════════════════════════════════════════
   GET /api/search/suggest?q=…
   ──────────────────────────────────────────────────────────────
   Live results for the header search panel: up to 6 products
   (thumb, name, price buyers pay) and 4 categories. Without a
   query it returns popular categories and best sellers. The
   query is trimmed and capped at 60 characters.
   ══════════════════════════════════════════════════════════════ */

import { getSearchStarters, getSearchSuggestions } from "@/lib/dal/products";
import { cleanQuery } from "@/lib/search/normalize";

const CACHE = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  if (raw.length > 500) {
    return Response.json({ error: "Query too long" }, { status: 400 });
  }
  const query = cleanQuery(raw);

  if (!query) {
    const starters = await getSearchStarters();
    return Response.json({ query: "", total: 0, ...starters }, { headers: CACHE });
  }

  return Response.json(await getSearchSuggestions(query), { headers: CACHE });
}
