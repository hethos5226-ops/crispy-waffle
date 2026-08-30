import type { Listing } from "@/lib/data/listing";
import type { CatalogSourceId } from "@/lib/data/catalog/types";

/**
 * BuyWise's domain entities.
 *
 * The single most important idea in BuyWise: **the product is the thing being
 * analysed, and a marketplace listing is only somewhere that product is
 * currently for sale.**
 *
 *     CanonicalProduct   Sony WH-1000XM5
 *       ├─ Offer         eBay AU  $399
 *       ├─ Offer         eBay AU  $429
 *       └─ Offer         eBay AU  $449
 *
 * Everything BuyWise wants to say — is it any good, is this a fair price, is
 * there something better, how old is it — is a statement about the *product*.
 * Only price, condition and seller are statements about an individual offer.
 * Conflating the two is what produced a scoring model in which four of six
 * factors were permanently unavailable.
 *
 * Nothing populates these yet. No catalogue measured so far can supply
 * canonical products for Australian consumer electronics — see
 * `docs/DATA_SOURCES.md` for the numbers, and `docs/BUYWISE_ARCHITECTURE.md`
 * for how the pieces fit together once one can.
 */

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

export interface ProductRating {
  average: number;
  count: number;
  /** Maximum of the source's scale, e.g. 5 or 10. */
  scale: number;
}

/**
 * A real, manufacturer-defined product, independent of who is selling it.
 *
 * Identity is `brand` + `mpn`. Both are required: the measurement in
 * `docs/DATA_SOURCES.md` showed a seller-supplied barcode resolving to an
 * entirely different product, so a GTIN corroborates identity and never
 * establishes it.
 */
export interface CanonicalProduct {
  /** Namespaced by the catalogue that supplied it, e.g. "bestbuy:6501354". */
  id: string;
  source: CatalogSourceId;
  /** Official product name, as the manufacturer publishes it. */
  name: string;
  brand: string;
  /** Manufacturer part number. Half of the identity pair; never optional. */
  mpn: string;
  /** Every barcode the catalogue lists. Corroboration only. */
  gtins: string[];
  category: string | null;
  summary: string | null;
  images: CatalogImage[];
  specGroups: CatalogSpecGroup[];
  /** ISO date. The genuine Product Age signal; null when unpublished. */
  releaseDate: string | null;
  rating: ProductRating | null;
}

/**
 * One seller's listing of a canonical product.
 *
 * `match` is retained deliberately: every association between a listing and a
 * product must be able to explain itself, both to a user ("matched on brand
 * and part number") and to whoever is debugging a wrong match later.
 */
export interface Offer {
  listing: Listing;
  productId: string;
  match: import("@/lib/data/catalog/resolver").MatchEvidence;
}

/** What the scoring engine and the product page are given. */
export interface ProductWithOffers {
  product: CanonicalProduct;
  /** Cheapest first. May be empty when a known product has no live offers. */
  offers: Offer[];
}

/** The cheapest offer BuyWise is confident enough to point a buyer at. */
export function cheapestOffer(product: ProductWithOffers): Offer | null {
  return product.offers.length > 0 ? product.offers[0] : null;
}
