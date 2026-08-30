import type { Listing } from "@/lib/data/listing";
import { getActiveMarket } from "@/lib/data/market";
import { productRefsFor, refKey } from "@/lib/data/catalog/ref";
import { CatalogSourceError, type ProductRef } from "@/lib/data/catalog/types";
import type { CanonicalProduct } from "@/lib/data/product";

/**
 * Resolves a listing to an official product datasheet, when — and only when —
 * the listing can be identified with certainty.
 *
 * The outcome is deliberately more detailed than "product or null", because
 * the three ways of finding nothing mean different things to a user and the
 * UI should be able to say which happened:
 *
 *   unidentified   — the seller published no barcode and no brand+part number,
 *                    so there is nothing to look up. Very common on eBay.
 *   not_in_catalog — we had a solid identifier; no catalogue covers this
 *                    product. Typical of off-brand and grey-market goods.
 *   unavailable    — the catalogue itself is unreachable or unconfigured.
 *                    A BuyWise problem, not a fact about the product.
 *
 * That distinction is also a genuine quality signal. A listing nobody can
 * identify is more likely to be generic or grey-market than one that resolves
 * cleanly to a manufacturer's datasheet — which is information we get for
 * free, from absence, without guessing at anything.
 */

export type EnrichmentStatus = "matched" | "unidentified" | "not_in_catalog" | "unavailable";

/** Not found is the only reason for a null product — so "matched" carries one. */
export type MissEnrichment = {
  status: Exclude<EnrichmentStatus, "matched">;
  product: null;
};

export type Enrichment = { status: "matched"; product: CanonicalProduct } | MissEnrichment;

const UNIDENTIFIED: MissEnrichment = { status: "unidentified", product: null };
const NOT_IN_CATALOG: MissEnrichment = { status: "not_in_catalog", product: null };
const UNAVAILABLE: MissEnrichment = { status: "unavailable", product: null };

/**
 * Process-lifetime cache. Datasheets are effectively static, so re-fetching
 * one within a session is pure waste — and the same product recurs constantly
 * across search results.
 */
const CACHE_LIMIT = 300;
const cache = new Map<string, Enrichment>();
/** In-flight requests, so N cards for the same product make one call. */
const inflight = new Map<string, Promise<Enrichment>>();

function remember(key: string, value: Enrichment): Enrichment {
  // Cheap FIFO eviction. Ordering by recency isn't worth the bookkeeping for
  // a cache this small.
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

async function lookupRef(ref: ProductRef): Promise<Enrichment> {
  const key = refKey(ref);

  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async (): Promise<Enrichment> => {
    const { catalogSources } = getActiveMarket();
    let sawError = false;

    for (const source of catalogSources) {
      if (!source.isConfigured()) {
        sawError = true;
        continue;
      }
      try {
        // The caller's AbortSignal is deliberately not forwarded: this promise
        // is shared between every card showing the same product, and one of
        // them unmounting must not cancel the lookup for the rest.
        const product = await source.lookup(ref);
        if (product) return remember(key, { status: "matched", product });
      } catch (error) {
        // A catalogue being down is not a fact about the product, so it is
        // never cached — the next caller should get a fresh attempt.
        if (error instanceof CatalogSourceError) {
          sawError = true;
          continue;
        }
        throw error;
      }
    }

    if (sawError) return UNAVAILABLE;
    return remember(key, NOT_IN_CATALOG);
  })();

  inflight.set(key, request);
  try {
    return await request;
  } finally {
    inflight.delete(key);
  }
}

/**
 * Looks a listing up across the active market's catalogues, strongest
 * identifier first, and stops at the first datasheet found.
 */
export async function enrichListing(
  listing: Listing,
  opts: { signal?: AbortSignal } = {}
): Promise<Enrichment> {
  const refs = productRefsFor(listing);
  if (refs.length === 0) return UNIDENTIFIED;

  let sawUnavailable = false;

  for (const ref of refs) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const result = await lookupRef(ref);
    if (result.status === "matched") return result;
    if (result.status === "unavailable") sawUnavailable = true;
  }

  return sawUnavailable ? UNAVAILABLE : NOT_IN_CATALOG;
}

/** Test/debug helper — never called from the UI. */
export function clearCatalogCache(): void {
  cache.clear();
  inflight.clear();
}
