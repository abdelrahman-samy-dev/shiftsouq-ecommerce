/* ══════════════════════════════════════════════════════════════
   <JsonLd> — structured data script tag (server component)
   ──────────────────────────────────────────────────────────────
   A native <script> is used on purpose (not next/script): JSON-LD
   is data, not executable code. `<` is escaped by serializeJsonLd.
   ══════════════════════════════════════════════════════════════ */

import { serializeJsonLd } from "./json-ld";

export default function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
