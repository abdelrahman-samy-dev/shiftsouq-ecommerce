/* ══════════════════════════════════════════════════════════════
   Admin catalogue — image rules (pure, client-safe)
   ──────────────────────────────────────────────────────────────
   • Uploads go to the public Storage bucket "product-images"
     (limits mirrored from supabase/migrations/20261114050000_
     admin_catalog.sql: 8 MB, jpeg / png / webp / avif).
   • A pasted image link must be https on a host next/image may
     load (next.config.ts images.remotePatterns): the stock photo
     hosts, or a public file of THIS project's own Storage (the host
     of NEXT_PUBLIC_SUPABASE_URL — never any *.supabase.co project).
     Plain-http local Storage is accepted only in development, as
     next.config.ts does.
   ══════════════════════════════════════════════════════════════ */

export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 16;

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;
export type ImageMime = keyof typeof IMAGE_TYPES;

export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");

export function isImageMime(v: unknown): v is ImageMime {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(IMAGE_TYPES, v);
}

export type ImageScope = "products" | "categories" | "collections";

/** Stock photo hosts mirrored from next.config.ts images.remotePatterns (production). */
const REMOTE_HOSTS: ReadonlyArray<{ host: RegExp; path: RegExp }> = [
  { host: /^images\.unsplash\.com$/, path: /^\// },
  { host: /^cdn\.dummyjson\.com$/, path: /^\// },
];

/** Local Supabase hosts next.config.ts allows in development only. */
const LOCAL_HOSTS = new Set(["127.0.0.1:54321", "localhost:54321"]);

/**
 * Host of this project's Supabase (its Storage serves our uploads) when it is
 * served over https on the default port, else null. Same rule as next.config.ts.
 */
export function projectStorageHost(supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  try {
    const url = new URL(supabaseUrl ?? "");
    return url.protocol === "https:" && !url.port ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** https on a stock photo host, or a file in this project's Storage. */
export function isRemoteImageAllowed(url: URL, supabaseUrl?: string): boolean {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  const storage = projectStorageHost(supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (storage && url.hostname === storage && url.pathname.startsWith("/storage/")) return true;
  return REMOTE_HOSTS.some((h) => h.host.test(url.hostname) && h.path.test(url.pathname));
}

const STORAGE_HOST = projectStorageHost();
export const ALLOWED_IMAGE_HOSTS = ["images.unsplash.com", "cdn.dummyjson.com", STORAGE_HOST ? `${STORAGE_HOST}/storage` : null]
  .filter(Boolean)
  .join(", ");

export interface ImageUrlOptions {
  /** Accept http://127.0.0.1:54321/storage/… (development). Defaults to NODE_ENV === "development". */
  allowLocal?: boolean;
  /** The project's Supabase URL (defaults to NEXT_PUBLIC_SUPABASE_URL). */
  supabaseUrl?: string;
}

export function isAllowedImageUrl(raw: string, opts: ImageUrlOptions = {}): boolean {
  if (typeof raw !== "string" || raw.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const allowLocal = opts.allowLocal ?? process.env.NODE_ENV === "development";
  if (url.protocol === "http:") {
    return allowLocal && LOCAL_HOSTS.has(url.host) && url.pathname.startsWith("/storage/");
  }
  return isRemoteImageAllowed(url, opts.supabaseUrl);
}

/** Public URL of a file in the bucket. */
export function publicImageUrl(supabaseUrl: string, path: string): string {
  const origin = supabaseUrl.replace(/\/+$/, "");
  return `${origin}/storage/v1/object/public/${IMAGE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The bucket path of one of our own public image URLs, or null when the URL
 * points anywhere else (another host, another bucket, an external image).
 */
export function storagePathFromUrl(raw: string, supabaseUrl: string): string | null {
  let url: URL;
  let origin: URL;
  try {
    url = new URL(raw);
    origin = new URL(supabaseUrl);
  } catch {
    return null;
  }
  if (url.origin !== origin.origin) return null;
  const prefix = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  if (!url.pathname.startsWith(prefix)) return null;
  const path = url.pathname.slice(prefix.length).split("/").map(decodeURIComponent).join("/");
  if (!path || path.includes("..") || !/^[a-z]+\/[A-Za-z0-9/_.-]+$/.test(path)) return null;
  return path;
}

/** New object path: products/2026/11/<random>.webp */
export function buildImagePath(scope: ImageScope, mime: ImageMime, random: string, now = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safe = random.replace(/[^A-Za-z0-9]/g, "").slice(0, 40) || "image";
  return `${scope}/${yyyy}/${mm}/${safe}.${IMAGE_TYPES[mime]}`;
}

export type UploadProblem = "type" | "size" | null;

export function checkUploadFile(file: { type: string; size: number }): UploadProblem {
  if (!isImageMime(file.type)) return "type";
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}
