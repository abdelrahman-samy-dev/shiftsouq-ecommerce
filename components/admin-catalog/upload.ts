"use client";

/* ══════════════════════════════════════════════════════════════
   Image upload from the admin's browser
   ──────────────────────────────────────────────────────────────
   1. The server action checks the admin and returns a one-time
      signed upload URL (no key ever reaches the browser).
   2. The file goes straight to Storage with XMLHttpRequest, so
      the editor can show progress.
   ══════════════════════════════════════════════════════════════ */

import { createImageUpload } from "@/lib/actions/admin-catalog";
import { checkUploadFile, type ImageScope } from "@/lib/admin/catalog-images";

export type UploadOutcome = { ok: true; url: string } | { ok: false; error: string };

export async function uploadImage(file: File, scope: ImageScope, onProgress?: (fraction: number) => void): Promise<UploadOutcome> {
  const problem = checkUploadFile(file);
  if (problem) return { ok: false, error: problem === "type" ? "upload_type" : "upload_size" };

  let ticket: Awaited<ReturnType<typeof createImageUpload>>;
  try {
    ticket = await createImageUpload({ scope, type: file.type, size: file.size });
  } catch {
    return { ok: false, error: "upload_failed" };
  }
  if (!ticket.ok) return { ok: false, error: ticket.error };
  const { uploadUrl, publicUrl } = ticket;

  return new Promise<UploadOutcome>((resolve) => {
    const body = new FormData();
    // Paths are unique per upload, so the file can be cached for a year.
    body.append("cacheControl", "31536000");
    body.append("", file);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.min(1, e.loaded / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve({ ok: true, url: publicUrl });
      } else {
        resolve({ ok: false, error: xhr.status === 413 ? "upload_size" : xhr.status === 415 ? "upload_type" : "upload_failed" });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: "upload_failed" });
    xhr.send(body);
  });
}
