"use client";

import { useSyncExternalStore } from "react";

const query = "(max-width: 767px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

// Use the page viewport: a 74%-wide desktop canvas must not trigger phone geometry.
export function useCompactViewport() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
