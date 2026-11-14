/* ══════════════════════════════════════════════════════════════
   GET /api/search/facets?scope=…&<listing params>
   ──────────────────────────────────────────────────────────────
   Filter options and counts for a selection that is not applied
   yet, so the filters drawer can show live counts and the
   "Show N products" total before the buyer applies it.
   ══════════════════════════════════════════════════════════════ */

import { parseListingParams } from "@/lib/search/listing-params";
import { loadListingFacets, scopeFromParam } from "@/lib/search/listing-server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const scope = await scopeFromParam(params.get("scope"));
  if (!scope) return Response.json({ error: "Unknown listing" }, { status: 404 });

  const { facets, categoryOptions } = await loadListingFacets(scope, parseListingParams(params));
  return Response.json(
    { facets, categoryOptions },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}
