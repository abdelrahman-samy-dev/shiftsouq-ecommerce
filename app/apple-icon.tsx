/* ══════════════════════════════════════════════════════════════
   Apple touch icon — /apple-icon (180×180 PNG)
   Also used as the Organization logo in JSON-LD and in the
   web app manifest.
   ══════════════════════════════════════════════════════════════ */

import { ImageResponse } from "next/og";
import { BRAND_MARK_PATH, BRAND_MARK_TRANSFORM } from "@/lib/seo/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 512 512" fill="none">
          <path d={BRAND_MARK_PATH} fill="#000000" transform={BRAND_MARK_TRANSFORM} />
        </svg>
      </div>
    ),
    size
  );
}
