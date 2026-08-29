import type { Listing, RetailerId } from "@/lib/data/listing";
import type { Verdict } from "@/lib/types";

/**
 * What History, Favorites and Overview remember about a listing.
 *
 * These screens can't re-query eBay for every saved item: it would spend the
 * daily quota on a screen the user opens constantly, and listings expire.
 * Instead the real values are captured when the listing is actually viewed,
 * and stamped with when that happened — so what's shown is genuine eBay data
 * with an honest "as seen" date, never a re-derived guess.
 */
export interface ListingSnapshot {
  id: string;
  retailer: RetailerId;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  /** BuyWise score at the time it was viewed, when one could be computed. */
  score: number | null;
  verdict: Verdict | null;
  /** Epoch ms the snapshot was taken. */
  capturedAt: number;
}

export function toSnapshot(
  listing: Listing,
  scoring: { score: number; verdict: Verdict } | null
): ListingSnapshot {
  return {
    id: listing.id,
    retailer: listing.retailer,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    imageUrl: listing.images[0]?.url ?? null,
    score: scoring?.score ?? null,
    verdict: scoring?.verdict ?? null,
    capturedAt: Date.now(),
  };
}

/** Guards against malformed or older entries left in localStorage. */
export function isSnapshot(value: unknown): value is ListingSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ListingSnapshot>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.price === "number" &&
    typeof v.currency === "string" &&
    typeof v.capturedAt === "number"
  );
}
