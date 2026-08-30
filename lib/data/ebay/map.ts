import type { Listing, ListingCondition, ListingImage, ListingRating, ListingSeller } from "@/lib/data/listing";
import type { EbayImage, EbayItem, EbayItemSummary } from "@/lib/data/ebay/types";

/**
 * Translates eBay's wire format into BuyWise's retailer-neutral `Listing`.
 *
 * The rule throughout: if eBay didn't send it, the field is null. Nothing is
 * defaulted, inferred or filled in with a plausible substitute.
 */

/** eBay's condition strings are free-text; map the common ones, keep the original. */
function mapCondition(condition: string | undefined): ListingCondition {
  if (!condition) return "UNKNOWN";
  const c = condition.toLowerCase();
  if (c.includes("new") && !c.includes("open")) return "NEW";
  if (c.includes("open box")) return "OPEN_BOX";
  if (c.includes("refurb")) return "REFURBISHED";
  if (c.includes("parts")) return "PARTS_ONLY";
  if (c.includes("used") || c.includes("pre-owned") || c.includes("good") || c.includes("acceptable")) return "USED";
  return "UNKNOWN";
}

function mapImages(item: EbayItemSummary): ListingImage[] {
  const raw: EbayImage[] = [
    ...(item.image ? [item.image] : []),
    ...(item.additionalImages ?? []),
  ];
  const seen = new Set<string>();
  const images: ListingImage[] = [];
  for (const img of raw) {
    if (!img.imageUrl || seen.has(img.imageUrl)) continue;
    seen.add(img.imageUrl);
    images.push({ url: img.imageUrl, width: img.width ?? null, height: img.height ?? null });
  }
  return images;
}

function mapSeller(item: EbayItemSummary): ListingSeller | null {
  const s = item.seller;
  if (!s?.username) return null;
  const pct = s.feedbackPercentage != null ? Number(s.feedbackPercentage) : NaN;
  return {
    name: s.username,
    feedbackPercentage: Number.isFinite(pct) ? pct : null,
    feedbackScore: s.feedbackScore ?? null,
  };
}

/** Only produced when eBay actually publishes a catalog product rating. */
function mapRating(item: EbayItemSummary): ListingRating | null {
  const r = item.primaryProductReviewRating;
  if (!r) return null;
  const average = r.averageRating != null ? Number(r.averageRating) : NaN;
  if (!Number.isFinite(average)) return null;

  let histogram: Record<string, number> | null = null;
  if (r.ratingHistograms?.length) {
    histogram = {};
    for (const bucket of r.ratingHistograms) {
      if (bucket.rating != null && bucket.count != null) histogram[bucket.rating] = bucket.count;
    }
    if (Object.keys(histogram).length === 0) histogram = null;
  }

  return { average, count: r.reviewCount ?? 0, histogram };
}

/**
 * A GTIN is only usable if it really is one. eBay's `gtin` arrives as a bare
 * string or an array, and aspect-sourced values can carry spaces, hyphens or
 * outright junk. Anything that isn't a plain 8/12/13/14-digit number is
 * discarded rather than passed on — a wrong barcode would resolve to a
 * confidently wrong product datasheet, which is worse than none at all.
 */
function normalizeGtin(raw: unknown): string | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== "string") return null;
  const digits = first.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  // All-zero and other degenerate placeholders show up in seller-entered data.
  if (/^0+$/.test(digits)) return null;
  return digits;
}

/** Brand/model come from a dedicated field when present, else from item aspects. */
function aspectValue(item: EbayItemSummary, names: string[]): string | null {
  for (const aspect of item.localizedAspects ?? []) {
    const name = aspect.localizedName?.toLowerCase();
    if (name && names.includes(name)) {
      const value = aspect.localizedValues?.[0];
      if (value) return value;
    }
  }
  return null;
}

export function mapEbayItem(item: EbayItem): Listing | null {
  // Without an id, title, URL and price there is nothing usable to show.
  const price = item.price?.value != null ? Number(item.price.value) : NaN;
  if (!item.itemId || !item.title || !item.itemWebUrl || !Number.isFinite(price)) return null;

  const listedAt = item.itemCreationDate ? Date.parse(item.itemCreationDate) : NaN;

  return {
    id: `ebay:${item.itemId}`,
    retailer: "ebay",
    productId: item.epid ?? null,
    gtin: normalizeGtin(item.gtin) ?? normalizeGtin(aspectValue(item, ["ean", "upc", "gtin"])),
    title: item.title,
    url: item.itemWebUrl,
    price,
    currency: item.price?.currency ?? "AUD",
    images: mapImages(item),
    condition: mapCondition(item.condition),
    conditionLabel: item.condition ?? null,
    brand: item.brand ?? aspectValue(item, ["brand"]),
    model: item.mpn ?? aspectValue(item, ["model", "mpn", "manufacturer part number"]),
    seller: mapSeller(item),
    rating: mapRating(item),
    marketplace: item.listingMarketplaceId ?? null,
    buyingOptions: item.buyingOptions ?? [],
    listedAt: Number.isFinite(listedAt) ? listedAt : null,
    topRatedSeller: item.topRatedBuyingExperience ?? null,
  };
}

/** Strips the "ebay:" namespace back off for API calls. */
export function toEbayItemId(listingId: string): string {
  return listingId.startsWith("ebay:") ? listingId.slice("ebay:".length) : listingId;
}
