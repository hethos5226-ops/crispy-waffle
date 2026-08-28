"use client";

import { useEffect, useState } from "react";

/**
 * Delays a fast-changing value. Used to keep every keystroke in the search
 * box from becoming its own eBay API call — the free tier allows 5,000 a
 * day, and typing "headphones" would otherwise spend ten of them.
 */
export function useDebounced<T>(value: T, delayMs = 450): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // setState happens in the timer callback, not during the effect itself.
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
