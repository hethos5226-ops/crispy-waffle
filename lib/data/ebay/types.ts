/**
 * The subset of the eBay Browse API response shape that BuyWise reads.
 * Everything is optional because eBay omits fields freely depending on the
 * listing — the mapper is responsible for turning absence into an explicit
 * null rather than a default.
 *
 * Reference: Browse API `item_summary/search` (ItemSummary) and `getItem` (Item).
 */

export interface EbayImage {
  imageUrl?: string;
  width?: number;
  height?: number;
}

export interface EbayPrice {
  value?: string;
  currency?: string;
}

export interface EbaySeller {
  username?: string;
  feedbackPercentage?: string;
  feedbackScore?: number;
}

export interface EbayRatingHistogram {
  rating?: string;
  count?: number;
}

/** Present only for listings matched to eBay's product catalog. */
export interface EbayReviewRating {
  averageRating?: string;
  reviewCount?: number;
  ratingHistograms?: EbayRatingHistogram[];
}

export interface EbayAspect {
  localizedName?: string;
  localizedValues?: string[];
}

export interface EbayItemSummary {
  itemId?: string;
  /** eBay catalog product id. Present only when the listing is catalog-matched. */
  epid?: string;
  /** The pre-Browse numeric item id, useful as a secondary dedupe key. */
  legacyItemId?: string;
  title?: string;
  itemWebUrl?: string;
  price?: EbayPrice;
  image?: EbayImage;
  thumbnailImages?: EbayImage[];
  additionalImages?: EbayImage[];
  condition?: string;
  conditionId?: string;
  seller?: EbaySeller;
  primaryProductReviewRating?: EbayReviewRating;
  brand?: string;
  mpn?: string;
  localizedAspects?: EbayAspect[];
  listingMarketplaceId?: string;
  /** e.g. ["FIXED_PRICE"], ["AUCTION"]. */
  buyingOptions?: string[];
  /** ISO 8601. Only ever the listing's own age — never the product's release date. */
  itemCreationDate?: string;
  topRatedBuyingExperience?: boolean;
}

export interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
  total?: number;
  warnings?: { message?: string }[];
}

/** getItem returns a superset of ItemSummary; we only add what we use. */
export interface EbayItem extends EbayItemSummary {
  shortDescription?: string;
  /**
   * Global Trade Item Number (EAN/UPC). Returned by getItem but not by
   * item_summary/search, which is why identifying a product can cost an
   * extra call. eBay has sent both a bare string and an array here.
   */
  gtin?: string | string[];
}
