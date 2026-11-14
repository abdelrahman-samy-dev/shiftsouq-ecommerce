"use client";

/* ══════════════════════════════════════════════════════════════
   useHydrated — false during SSR and hydration, true afterwards.
   Lets components read browser-only state (persisted Zustand
   stores) without a hydration mismatch and without a
   setState-in-effect "mounted" flag.
   ══════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
