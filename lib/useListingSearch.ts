"use client";

import { useCallback, useEffect, useState } from "react";
import { ebaySource, isEbayConfigured } from "@/lib/data/ebay/source";
import type { Listing } from "@/lib/data/listing";

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; listings: Listing[]; query: string }
  | { status: "error"; error: unknown };

/**
 * Runs a live search against the product service.
 *
 * Results are stored keyed by the request that produced them, and the status
 * is derived from whether that key still matches the current one. That keeps
 * a slow earlier response from overwriting a newer one, and avoids setting
 * state synchronously inside the effect.
 */
export function useListingSearch(query: string, opts: { limit?: number } = {}) {
  const limit = opts.limit;
  const trimmed = query.trim();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{
    key: string;
    listings?: Listing[];
    error?: unknown;
  } | null>(null);

  const key = `${trimmed}::${limit ?? ""}::${attempt}`;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!trimmed) return;

    const controller = new AbortController();
    ebaySource
      .search(trimmed, { limit, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setOutcome({ key, listings: result.listings });
      })
      .catch((error) => {
        // An abort means the query moved on, not that anything failed.
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        setOutcome({ key, error });
      });

    return () => controller.abort();
  }, [key, trimmed, limit]);

  let state: SearchState;
  if (!trimmed) state = { status: "idle" };
  else if (outcome?.key !== key) state = { status: "loading" };
  else if (outcome.error !== undefined) state = { status: "error", error: outcome.error };
  else state = { status: "ready", listings: outcome.listings ?? [], query: trimmed };

  return { state, retry, configured: isEbayConfigured() };
}
