/**
 * Types for *real* marketplace listings, as opposed to the hand-authored
 * demo `Product`. Every field here maps to something a retailer API actually
 * returns — anything a given retailer can't supply is `null`, never filled
 * in with a plausible-looking value.
 */

/** Which retailer a listing came from. Add a case per integrated source. */
export type RetailerId = "ebay";

export const RETAILER_LABELS: Record<RetailerId, string> = {
  ebay: "eBay",
};

export interface ListingImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface ListingSeller {
  name: string;
  /** Percentage of positive feedback, 0-100. Null when the retailer doesn't expose it. */
  feedbackPercentage: number | null;
  feedbackScore: number | null;
}

/**
 * Aggregate product rating, only ever populated from a rating the retailer
 * itself publishes. eBay supplies this for catalog-matched listings via
 * `primaryProductReviewRating`; it is absent for most listings, in which
 * case this whole object is null.
 */
export interface ListingRating {
  /** Average stars, on the retailer's own scale (eBay: 1-5). */
  average: number;
  count: number;
  /** Star -> number of reviews, when the retailer breaks it down. */
  histogram: Record<string, number> | null;
}

export type ListingCondition =
  | "NEW"
  | "OPEN_BOX"
  | "REFURBISHED"
  | "USED"
  | "PARTS_ONLY"
  | "UNKNOWN";

export interface Listing {
  /** Stable id, namespaced by retailer, e.g. "ebay:v1|123456|0". */
  id: string;
  retailer: RetailerId;
  /**
   * Retailer's own catalog product id (eBay ePID), when the listing is
   * matched to one. Null for most listings — a seller can list anything
   * without eBay recognising it as a known product.
   */
  productId: string | null;
  /**
   * Global Trade Item Number (EAN/UPC), digits only. This and brand+MPN are
   * the *only* identifiers BuyWise will match a product catalogue on.
   * Null unless the retailer published one.
   */
  gtin: string | null;
  title: string;
  /** Retailer's own product/listing page. */
  url: string;
  price: number;
  currency: string;
  images: ListingImage[];
  condition: ListingCondition;
  /** Free-text condition as the retailer phrased it, when richer than the enum. */
  conditionLabel: string | null;
  brand: string | null;
  model: string | null;
  seller: ListingSeller | null;
  rating: ListingRating | null;
  /** Marketplace the listing belongs to, e.g. "EBAY_AU". */
  marketplace: string | null;
  /** e.g. ["FIXED_PRICE"]. Empty when the retailer didn't say. */
  buyingOptions: string[];
  /**
   * When this *listing* was created, epoch ms. Not the product's release
   * date — eBay publishes no such thing, and conflating the two would
   * invent a product age from a seller's posting date.
   */
  listedAt: number | null;
  /** Retailer's own trusted-seller flag. Null when not published. */
  topRatedSeller: boolean | null;
}

/** A search result set plus enough context to explain what was searched. */
export interface ListingSearchResult {
  query: string;
  listings: Listing[];
  /** Total matches the retailer reports, which may exceed what was returned. */
  total: number | null;
}

/**
 * The seam every retailer integration implements. The UI and scoring engine
 * talk only to this, so adding Amazon Australia (or any other retailer)
 * means writing one more implementation — no UI changes.
 */
export interface SourceRequestOptions {
  signal?: AbortSignal;
  /**
   * Retailer-specific marketplace/region id, supplied by the active `Market`
   * (e.g. eBay's "EBAY_AU"). Omitted means "whatever the backend defaults to",
   * which is how the Australian build runs today.
   */
  marketplace?: string;
}

export interface ProductSource {
  readonly id: RetailerId;
  search(
    query: string,
    opts?: SourceRequestOptions & { limit?: number; sort?: string; offset?: number }
  ): Promise<ListingSearchResult>;
  getById(id: string, opts?: SourceRequestOptions): Promise<Listing | null>;
}

/** Distinguishes "the API said no results" from "the API call itself failed". */
export class ProductSourceError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "network" | "rate_limited" | "upstream" | "not_found",
    readonly status?: number
  ) {
    super(message);
    this.name = "ProductSourceError";
  }
}

const CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "New",
  OPEN_BOX: "Open box",
  REFURBISHED: "Refurbished",
  USED: "Used",
  PARTS_ONLY: "For parts",
  UNKNOWN: "Condition not stated",
};

export function conditionLabel(listing: Listing): string {
  return listing.conditionLabel ?? CONDITION_LABELS[listing.condition];
}
