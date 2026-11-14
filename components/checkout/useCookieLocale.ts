"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Buyer's language from the NEXT_LOCALE cookie, for client-only screens such as error boundaries. */
export function useCookieLocale(): "en" | "ar" {
  return useSyncExternalStore(
    subscribe,
    () => (/(?:^|;\s*)NEXT_LOCALE=ar(?:;|$)/.test(document.cookie) ? "ar" : "en"),
    () => "en",
  );
}
