import type { Listing } from "@/lib/data/listing";
import type { ScoreFactor, Verdict } from "@/lib/types";
import { SCORE_WEIGHTS } from "@/lib/scoreWeights";
import { composeScore } from "@/lib/score/factors";

/**
 * Scores a real marketplace listing with the same six-factor model used for
 * the demo catalog, so the UI renders identically.
 *
 * The difference is honesty about sources. eBay publishes no price history,
 * review text, warranty terms or release dates, so those factors come back
 * `null` and the existing redistribution logic excludes them — rather than
 * being filled in with invented values.
 */

export interface PriceContext {
  /** Median of the other current listings matched for the same search. */
  median: number;
  comparedCount: number;
  percentBelowMedian: number;
  low: number;
  high: number;
}

export interface ListingAnalysis {
  listing: Listing;
  /** Null when eBay supplied too little to score the listing at all. */
  score: number | null;
  verdict: Verdict | null;
  factors: ScoreFactor[];
  weightRedistributed: boolean;
  /** Share of the scoring weight that had real data behind it, 0-1. */
  confidence: number;
  /** True when a BUY NOW was held back to WAIT purely for lack of evidence. */
  verdictLimitedByConfidence: boolean;
  /** Null when there weren't enough comparable listings to say anything. */
  priceContext: PriceContext | null;
  reasoning: string;
  alternative: Listing | null;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Comparable listings are the other results for the same search, restricted
 * to the same condition — a used unit priced under a shelf of new ones isn't
 * a bargain, it's a different product.
 */
function comparablePeers(listing: Listing, peers: Listing[]): Listing[] {
  return peers.filter((p) => p.id !== listing.id && p.condition === listing.condition && p.price > 0);
}

function buildPriceContext(listing: Listing, peers: Listing[]): PriceContext | null {
  const comparable = comparablePeers(listing, peers);
  // Two peers is the fewest that makes a median mean anything at all.
  if (comparable.length < 2) return null;

  const prices = comparable.map((p) => p.price);
  const med = median(prices);
  return {
    median: med,
    comparedCount: comparable.length,
    percentBelowMedian: ((med - listing.price) / med) * 100,
    low: Math.min(...prices),
    high: Math.max(...prices),
  };
}

export function analyzeListing(listing: Listing, peers: Listing[]): ListingAnalysis {
  const priceContext = buildPriceContext(listing, peers);

  const priceFactor: ScoreFactor = priceContext
    ? {
        key: "price",
        label: "Price & Value",
        weight: SCORE_WEIGHTS.price,
        score: Math.round(clamp(60 + priceContext.percentBelowMedian * 2, 0, 100)),
        detail:
          priceContext.percentBelowMedian >= 1
            ? `About ${Math.round(priceContext.percentBelowMedian)}% below the median of ${priceContext.comparedCount} comparable listings right now.`
            : priceContext.percentBelowMedian <= -1
              ? `About ${Math.round(-priceContext.percentBelowMedian)}% above the median of ${priceContext.comparedCount} comparable listings right now.`
              : `Around the median of ${priceContext.comparedCount} comparable listings right now.`,
      }
    : {
        key: "price",
        label: "Price & Value",
        weight: SCORE_WEIGHTS.price,
        score: null,
        detail:
          "Not enough comparable listings in the same condition to judge this price. eBay doesn't publish price history, so there's no typical price to compare against.",
      };

  // eBay's catalog rating, when the listing is matched to a catalog product.
  const rating = listing.rating;
  const reviewsFactor: ScoreFactor = rating
    ? {
        key: "reviews",
        label: "Reviews & Quality",
        weight: SCORE_WEIGHTS.reviews,
        score: Math.round(clamp((rating.average / 5) * 100, 0, 100)),
        detail: `${rating.average.toFixed(1)} out of 5 from ${rating.count.toLocaleString()} eBay product review${rating.count === 1 ? "" : "s"}.`,
      }
    : {
        key: "reviews",
        label: "Reviews & Quality",
        weight: SCORE_WEIGHTS.reviews,
        score: null,
        detail: "eBay has no product rating for this listing — it isn't matched to a catalog product.",
      };

  // A rating histogram shows how consistent owner experience is: a product
  // averaging 4 because everyone gives it 4 is not the same as one averaging
  // 4 from a mix of 5s and 1s.
  let reliabilityFactor: ScoreFactor;
  if (rating?.histogram) {
    const counts = Object.entries(rating.histogram).map(([stars, count]) => ({ stars: Number(stars), count }));
    const total = counts.reduce((sum, c) => sum + c.count, 0);
    const lowStars = counts.filter((c) => c.stars <= 2).reduce((sum, c) => sum + c.count, 0);
    if (total > 0) {
      const lowShare = lowStars / total;
      reliabilityFactor = {
        key: "reliability",
        label: "Reliability",
        weight: SCORE_WEIGHTS.reliability,
        score: Math.round(clamp(100 - lowShare * 180, 10, 100)),
        detail: `${Math.round(lowShare * 100)}% of reviews are 1 or 2 stars, across ${total.toLocaleString()} ratings.`,
      };
    } else {
      reliabilityFactor = unavailableReliability();
    }
  } else {
    reliabilityFactor = unavailableReliability();
  }

  // Cheapest comparable peer is the natural "consider this instead".
  const comparable = comparablePeers(listing, peers);
  const cheaper = comparable.filter((p) => p.price < listing.price).sort((a, b) => a.price - b.price);
  const alternative = cheaper[0] ?? null;

  const alternativesFactor: ScoreFactor = comparable.length
    ? {
        key: "alternatives",
        label: "Alternatives",
        weight: SCORE_WEIGHTS.alternatives,
        score: Math.round(clamp(90 - (cheaper.length / comparable.length) * 70, 20, 95)),
        detail: cheaper.length
          ? `${cheaper.length} of ${comparable.length} comparable listings are cheaper than this one.`
          : `This is the cheapest of ${comparable.length + 1} comparable listings.`,
      }
    : {
        key: "alternatives",
        label: "Alternatives",
        weight: SCORE_WEIGHTS.alternatives,
        score: null,
        detail: "No comparable listings found to weigh this against.",
      };

  const factors: ScoreFactor[] = [
    priceFactor,
    reviewsFactor,
    reliabilityFactor,
    alternativesFactor,
    {
      key: "warranty",
      label: "Warranty",
      weight: SCORE_WEIGHTS.warranty,
      score: null,
      detail: "eBay's listing data doesn't include warranty terms, so this can't be scored.",
    },
    {
      key: "age",
      label: "Product Age",
      weight: SCORE_WEIGHTS.age,
      score: null,
      detail: "eBay's listing data doesn't include a model release date, so this can't be scored.",
    },
  ];

  // Composed by lib/score/factors.ts rather than here. This path used to
  // carry its own copy of the redistribution and verdict maths, which is
  // exactly how two implementations of one rule drift apart — the confidence
  // guard was added to one and missing from the other for as long as both
  // existed.
  const composite = composeScore(factors);
  const { score, verdict } = composite;

  return {
    listing,
    score,
    verdict,
    factors,
    weightRedistributed: composite.weightRedistributed,
    confidence: composite.confidence,
    verdictLimitedByConfidence: composite.verdictLimitedByConfidence,
    priceContext,
    reasoning: buildReasoning(
      listing,
      verdict,
      priceContext,
      rating,
      alternative,
      factors.filter((f) => f.score != null).length
    ),
    alternative,
  };
}

function unavailableReliability(): ScoreFactor {
  return {
    key: "reliability",
    label: "Reliability",
    weight: SCORE_WEIGHTS.reliability,
    score: null,
    detail: "eBay doesn't publish review text or a rating breakdown for this listing, so recurring problems can't be identified.",
  };
}

function buildReasoning(
  listing: Listing,
  verdict: Verdict | null,
  priceContext: PriceContext | null,
  rating: Listing["rating"],
  alternative: Listing | null,
  availableFactorCount: number
): string {
  const parts: string[] = [];

  if (verdict === null) {
    return "eBay didn't publish enough about this listing to score it — no comparable listings to price it against, and no product rating. The listing details below are everything eBay provided.";
  }

  if (verdict === "BUY_NOW") parts.push(`This listing looks like a strong pick right now.`);
  else if (verdict === "WAIT") parts.push(`This listing is reasonable but not a clear buy.`);
  else parts.push(`This listing is hard to recommend at its current price.`);

  if (priceContext) {
    const pct = Math.round(Math.abs(priceContext.percentBelowMedian));
    if (priceContext.percentBelowMedian >= 1) {
      parts.push(`It's about ${pct}% below the median of ${priceContext.comparedCount} comparable listings.`);
    } else if (priceContext.percentBelowMedian <= -1) {
      parts.push(`It's about ${pct}% above the median of ${priceContext.comparedCount} comparable listings.`);
    } else {
      parts.push(`It sits right around the median of ${priceContext.comparedCount} comparable listings.`);
    }
  }

  if (rating) {
    parts.push(`eBay shows ${rating.average.toFixed(1)}/5 from ${rating.count.toLocaleString()} product reviews.`);
  }

  if (alternative) {
    parts.push(`A comparable listing is available for less.`);
  }

  parts.push(
    `Scored on ${availableFactorCount} of 6 factors — the rest aren't in eBay's listing data and were excluded rather than guessed.`
  );

  return parts.join(" ");
}
