/**
 * The product-catalogue seam: "what IS this thing", as opposed to
 * `ProductSource`, which answers "what does it cost right now".
 *
 * Two different kinds of truth, deliberately kept apart:
 *
 *   ProductSource  — one seller's offer. Price, condition, seller. Volatile.
 *   ProductCatalog — the manufacturer's product. Specs, official name and
 *                    photography, release date. Stable, brand-supplied.
 *
 * They must never be blurred in the UI, because their trust levels differ.
 *
 * **No source implements this yet.** Open Icecat was built against it and
 * removed after measurement — 2 of 225 live eBay AU listings resolved, and one
 * of those two was wrong. The interface stays because the problem is a missing
 * source, not a wrong design. See `docs/DATA_SOURCES.md`.
 */

/** Catalogues BuyWise may implement. Extended when one is actually adopted. */
export type CatalogSourceId = "bestbuy";

export const CATALOG_LABELS: Record<CatalogSourceId, string> = {
  bestbuy: "Best Buy",
};

/** How a listing was tied to a catalogue product. Never a title guess. */
export type ProductMatchKind = "gtin" | "brand-mpn";

export const MATCH_LABELS: Record<ProductMatchKind, string> = {
  gtin: "barcode (GTIN)",
  "brand-mpn": "brand and part number",
};

/**
 * The only ways BuyWise is permitted to look a product up.
 *
 * There is deliberately no `{ kind: "title" }` variant. Matching a datasheet
 * to a listing by how similar their titles look would attach a manufacturer's
 * specifications to a product that might not be the one being sold.
 *
 * Note that a `gtin` ref may *find* a candidate, but finding is not
 * accepting — `lib/data/catalog/resolver.ts` still requires part-number
 * agreement before any candidate becomes a match. Seller-supplied barcodes
 * were measured resolving to entirely unrelated products.
 */
export type ProductRef =
  | { kind: "gtin"; gtin: string }
  | { kind: "brand-mpn"; brand: string; mpn: string };

export interface ProductCatalog {
  readonly id: CatalogSourceId;
  /** Resolves an exact identifier to a candidate product, or null. */
  lookup(ref: ProductRef, opts?: { signal?: AbortSignal }): Promise<import("@/lib/data/product").CanonicalProduct | null>;
  /**
   * The canonical set this source can supply, for building a local index.
   *
   * Optional because not every catalogue offers bulk export. This is the
   * capability the product-first architecture actually needs: resolving one
   * listing at a time costs an API call per card, while a local index costs
   * none. Icecat publishes exactly such an index; we were never able to
   * download it (HTTP Basic, needs a password).
   */
  index?(opts?: { signal?: AbortSignal }): Promise<import("@/lib/data/product").CanonicalProduct[]>;
  /** False when this deployment has no credentials for the source. */
  isConfigured(): boolean;
}

/** Mirrors ProductSourceError so callers can treat both seams alike. */
export class CatalogSourceError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "network" | "rate_limited" | "upstream",
    readonly status?: number
  ) {
    super(message);
    this.name = "CatalogSourceError";
  }
}
