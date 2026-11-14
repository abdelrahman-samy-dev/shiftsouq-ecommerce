"use client";

/* ══════════════════════════════════════════════════════════════
   Unsaved-changes guard for full-page editors
   ──────────────────────────────────────────────────────────────
   • Reload / close tab / typed URL: the browser's own prompt
     (beforeunload).
   • Links inside the app: clicks are caught before Next handles
     them and a confirm dialog asks first.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./controls";

export function useUnsavedGuard(
  dirty: boolean,
  labels: { title: string; body: string; leave: string; stay: string; close: string },
  /** Runs when the admin chooses to leave (e.g. delete photos uploaded but never saved). */
  onLeave?: () => void,
) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    dirtyRef.current = dirty;
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noGuard !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // in-page anchors
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={pendingHref !== null}
      title={labels.title}
      body={labels.body}
      confirmLabel={labels.leave}
      cancelLabel={labels.stay}
      closeLabel={labels.close}
      destructive
      onConfirm={() => {
        const href = pendingHref;
        dirtyRef.current = false;
        setPendingHref(null);
        onLeaveRef.current?.();
        if (href) router.push(href);
      }}
      onClose={() => setPendingHref(null)}
    />
  );

  /** Lets the editor navigate on purpose (after saving or deleting) without the prompt. */
  const release = () => {
    dirtyRef.current = false;
  };

  return { dialog, release };
}
