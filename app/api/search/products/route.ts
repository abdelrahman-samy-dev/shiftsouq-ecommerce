/* ══════════════════════════════════════════════════════════════
   GET /api/search/products?scope=…&<listing params>&page=N
   ──────────────────────────────────────────────────────────────
   One page of listing cards for "Load more". `scope` is "shop",
   "search", "category:<slug>" or "collection:<slug>"; the other
   parameters are the listing URL's own (lib/search/listing-params).
   ══════════════════════════════════════════════════════════════ */

import { parseListingParams } from "@/lib/search/listing-params";
import { loadListingPage, scopeFromParam } from "@/lib/search/listing-server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const scope = await scopeFromParam(params.get("scope"));
  if (!scope) return Response.json({ error: "Unknown listing" }, { status: 404 });

  const state = parseListingParams(params);
  const { products, total } = await loadListingPage(scope, state);
  return Response.json(
    { page: state.page, total, products },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
