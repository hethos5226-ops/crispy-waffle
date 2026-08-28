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
}

export interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
  total?: number;
  warnings?: { message?: string }[];
}

/** getItem returns a superset of ItemSummary; we only add what we use. */
export interface EbayItem extends EbayItemSummary {
  shortDescription?: string;
}
