"use client";

import { useEffect, useState } from "react";
import type { Listing } from "@/lib/data/listing";
import { enrichListing, type Enrichment } from "@/lib/data/catalog/lookup";
import { productRefsFor } from "@/lib/data/catalog/ref";

/**
 * Looks up the official datasheet for a listing, if it can be identified.
 *
 * Follows the same keyed-outcome shape as `useListingSearch`: results are
 * stored against the request that produced them, so a slow earlier lookup
 * can't overwrite a newer one and nothing is set synchronously inside the
 * effect.
 *
 * Enrichment is strictly additive. The page renders completely from eBay
 * data first and only gains a product panel if and when a confident match
 * arrives, so a slow or missing catalogue never delays or degrades the
 * offer information the user actually came for.
 */

export type CatalogState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; enrichment: Enrichment };

export function useCatalogProduct(listing: Listing | null): CatalogState {
  const id = listing?.id ?? "";
  // Nothing to look up when the seller published no usable identifier.
  const identifiable = listing ? productRefsFor(listing).length > 0 : false;

  const [outcome, setOutcome] = useState<{ key: string; enrichment: Enrichment } | null>(null);
  const key = id;

  useEffect(() => {
    if (!listing || !identifiable) return;

    const controller = new AbortController();
    enrichListing(listing, { signal: controller.signal })
      .then((enrichment) => {
        if (!controller.signal.aborted) setOutcome({ key, enrichment });
      })
      .catch((error) => {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        // An unreachable catalogue is reported as such rather than thrown:
        // the rest of the page is unaffected by it.
        setOutcome({ key, enrichment: { status: "unavailable", product: null } });
      });

    return () => controller.abort();
    // `listing` is intentionally not a dependency — it is a fresh object on
    // every render, while its identity for this purpose is its id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, identifiable]);

  if (!listing) return { status: "idle" };
  if (!identifiable) {
    return { status: "ready", enrichment: { status: "unidentified", product: null } };
  }
  if (outcome?.key !== key) return { status: "loading" };
  return { status: "ready", enrichment: outcome.enrichment };
}
