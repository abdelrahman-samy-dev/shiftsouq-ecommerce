"use client";

/* ══════════════════════════════════════════════════════════════
   useStoredValue — a localStorage string as external state
   ──────────────────────────────────────────────────────────────
   Null on the server and during hydration (so markup matches),
   the stored value afterwards. Writes notify every component on
   the page and other tabs ("storage" event). Storage can be
   blocked (private mode): reads then return null, writes no-op.
   ══════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: keep working without it */
  }
  listeners.forEach((l) => l());
}

export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readStored(key),
    () => null,
  );
}
