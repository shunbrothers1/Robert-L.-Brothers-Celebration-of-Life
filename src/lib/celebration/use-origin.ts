"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * The site's origin ("https://example.com") in the browser, or "" during
 * server rendering — so full links render client-side without a hydration
 * mismatch.
 */
export function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => ""
  );
}

/** Whether this browser has a native share sheet (most phones). */
export function useCanShare(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false
  );
}
