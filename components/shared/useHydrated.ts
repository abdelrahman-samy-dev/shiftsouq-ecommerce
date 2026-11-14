"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during server rendering and hydration, `true` afterwards.
 *
 * Used where the markup depends on browser-only state (localStorage
 * cart / wishlist, the active theme) so the first client render
 * matches the server HTML. Unlike `useEffect(() => setMounted(true))`
 * it does not trigger an extra cascading render.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
