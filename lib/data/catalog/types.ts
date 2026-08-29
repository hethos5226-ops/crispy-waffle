/**
 * The product-catalogue seam: "what IS this thing", as opposed to
 * `ProductSource`, which answers "what does it cost right now".
 *
 * Two different kinds of truth, deliberately kept apart:
 *
 *   ProductSource  (eBay)    — one seller's offer. Price, condition, seller.
 *   ProductCatalog (Icecat)  — the manufacturer's product. Specs, official
 *                              name and photography, release date.
 *
 * They must never be blurred in the UI, because their trust levels differ.
 * A price is a fact about a listing that changes hourly; a datasheet is
 * brand-supplied and stable. Every screen that shows both has to say which
 * is which — see `CATALOG_LABELS` and the attribution the UI renders.
 *
 * Adding Best Buy (US) later means one more implementation of
 * `ProductCatalog` and one more entry in `lib/data/market.ts`. Nothing in
 * the UI or the scoring engine changes.
 */

export type CatalogSourceId = "icecat" | "bestbuy";

export const CATALOG_LABELS: Record<CatalogSourceId, string> = {
  icecat: "Icecat",
  bestbuy: "Best Buy",
};

/** How a listing was tied to a catalogue product. Never a title guess. */
export type ProductMatchKind = "gtin" | "brand-mpn";

export const MATCH_LABELS: Record<ProductMatchKind, string> = {
  gtin: "barcode (GTIN)",
  "brand-mpn": "brand and part number",
};

/**
 * The only ways BuyWise is permitted to identify a product.
 *
 * There is deliberately no `{ kind: "title" }` variant. Matching a datasheet
 * to a listing by how similar their titles look would attach a manufacturer's
 * specifications to a product that might not be the one being sold — which is
 * fabricating product information, however plausible the result looked.
 */
export type ProductRef =
  | { kind: "gtin"; gtin: string }
  | { kind: "brand-mpn"; brand: string; mpn: string };

export interface CatalogImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface CatalogSpec {
  name: string;
  value: string;
}

export interface CatalogSpecGroup {
  name: string;
  specs: CatalogSpec[];
}

export interface CatalogRating {
  average: number;
  count: number;
  /** Max of the source's scale, e.g. 5 or 10. */
  scale: number;
}

/** A manufacturer-described product, independent of who is selling it. */
export interface CatalogProduct {
  /** Namespaced by source, e.g. "icecat:1234567". */
  id: string;
  source: CatalogSourceId;
  /** The official product name, as the brand publishes it. */
  name: string;
  brand: string | null;
  mpn: string | null;
  /** Every barcode the catalogue lists for this product. */
  gtins: string[];
  category: string | null;
  /** Brand-written summary. Marketing copy, but the manufacturer's own. */
  summary: string | null;
  /** Official product photography. */
  images: CatalogImage[];
  specGroups: CatalogSpecGroup[];
  /**
   * ISO date the product was released, when the catalogue publishes it.
   * This is the genuine product-age signal eBay could never supply — and it
   * is emphatically not a listing's posting date.
   */
  releaseDate: string | null;
  rating: CatalogRating | null;
  /** Which identifier produced this match, for display and for scoring. */
  matchedBy: ProductMatchKind;
}

export interface ProductCatalog {
  readonly id: CatalogSourceId;
  /** Resolves an exact identifier to a product, or null when unknown. */
  lookup(ref: ProductRef, opts?: { signal?: AbortSignal }): Promise<CatalogProduct | null>;
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
