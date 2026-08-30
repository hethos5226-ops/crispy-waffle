import type { ProductWithOffers } from "@/lib/data/product";
import type { ScoreFactor, ScoreFactorKey, Verdict } from "@/lib/types";
import { SCORE_WEIGHTS } from "@/lib/scoreWeights";

/**
 * The six-factor BuyWise score, and the seam that lets each factor get its own
 * data source.
 *
 * The six factors are fixed. What changes over time is who can answer them:
 *
 *   Price & Value      eBay offers + BuyWise's own observed price history
 *   Reviews & Quality  unavailable — no free source measured can supply review text
 *   Reliability        unavailable — needs review text to find recurring issues
 *   Alternatives       comparable canonical products and their real offers
 *   Warranty           unavailable — no source measured publishes terms
 *   Product Age        a catalogue release date, where confidently matched
 *
 * A provider that cannot answer returns `score: null`. It must never return a
 * plausible number instead. `composeScore` then redistributes that factor's
 * weight across the ones that could answer, so a missing source lowers
 * confidence rather than silently inventing a verdict.
 *
 * Adding a source later — a reviews API, a price-history provider — means
 * registering one more provider. Neither the scoring maths nor the UI changes.
 */

export interface ScoringContext {
  /** The product being scored, with whatever offers are currently known. */
  subject: ProductWithOffers;
  /**
   * Comparable products, for the Alternatives factor. Empty when BuyWise has
   * nothing to compare against — which is itself a reason to return null.
   */
  comparables: ProductWithOffers[];
  /** Evaluation time, injected so scoring stays deterministic in tests. */
  now: Date;
}

export interface FactorProvider {
  readonly key: ScoreFactorKey;
  readonly label: string;
  /** Share of the composite before any redistribution. */
  readonly weight: number;
  /**
   * Returns a scored factor, or one with `score: null` when this provider has
   * no reliable data. `detail` must explain *why* in either case — an
   * unavailable factor is information, and the UI shows it.
   */
  evaluate(context: ScoringContext): ScoreFactor;
}

export interface CompositeScore {
  /** Null when no factor could be scored at all. */
  score: number | null;
  verdict: Verdict | null;
  factors: ScoreFactor[];
  /** True when at least one factor was unavailable and its weight moved. */
  weightRedistributed: boolean;
  /**
   * True when the score alone would have said BUY NOW but too little of the
   * model had real data behind it. The UI should explain this rather than
   * silently showing WAIT.
   */
  verdictLimitedByConfidence: boolean;
  /** Share of total weight that had real data behind it, 0-1. */
  confidence: number;
}

const BUY_NOW_AT = 75;
const WAIT_AT = 50;

/**
 * Share of the total weight that must come from real data before BuyWise is
 * allowed to say BUY NOW.
 *
 * Redistribution alone lets missing data flatter a product. Scoring the
 * average of what we know is honest arithmetic, but the *verdict* drawn from
 * it is not, because the factors eBay can populate (price, alternatives) are
 * systematically the flattering ones, while the factors it never supplies
 * (warranty, product age) and usually omits (reviews, reliability) are the
 * ones that would temper the result. Measured:
 *
 *   price 90, alternatives 90, everything else unknown  →  90  BUY NOW
 *   the same product with reviews 40, reliability 50,
 *   warranty 60, age 60 also known                      →  66  WAIT
 *
 * Not knowing made the product look better. That is the opposite of what a
 * buying assistant should do, so a positive verdict now requires evidence
 * behind at least half the model.
 *
 * The cap is deliberately one-directional. A false BUY costs someone money; a
 * false DON'T BUY costs them a deal they might have wanted. So thin evidence
 * may still produce a negative verdict, but never a positive one.
 */
export const MIN_CONFIDENCE_FOR_BUY = 0.5;

export function verdictForScore(score: number): Verdict {
  if (score >= BUY_NOW_AT) return "BUY_NOW";
  if (score >= WAIT_AT) return "WAIT";
  return "DONT_BUY";
}

/**
 * Combines factors into one score, redistributing the weight of any factor
 * that had no data.
 *
 * With nothing scoreable the result is null rather than zero. Zero reads as a
 * damning verdict on a product; null says we don't know, which is the truth.
 */
export function composeScore(factors: ScoreFactor[]): CompositeScore {
  const available = factors.filter((f) => f.score != null);
  const availableWeight = available.reduce((sum, f) => sum + f.weight, 0);
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  if (availableWeight === 0) {
    return {
      score: null,
      verdict: null,
      factors,
      weightRedistributed: true,
      verdictLimitedByConfidence: false,
      confidence: 0,
    };
  }

  const score = Math.round(
    available.reduce((sum, f) => sum + (f.score as number) * f.weight, 0) / availableWeight
  );

  const confidence = totalWeight === 0 ? 0 : availableWeight / totalWeight;
  const rawVerdict = verdictForScore(score);

  // A BUY NOW that rests on too little evidence is downgraded to WAIT — the
  // score still reads high and the breakdown still shows why, but BuyWise
  // does not tell someone to buy on the strength of what it could not see.
  const verdict: Verdict =
    rawVerdict === "BUY_NOW" && confidence < MIN_CONFIDENCE_FOR_BUY ? "WAIT" : rawVerdict;

  return {
    score,
    verdict,
    /** True when the verdict was held back purely for lack of evidence. */
    verdictLimitedByConfidence: verdict !== rawVerdict,
    factors,
    weightRedistributed: available.length < factors.length,
    confidence,
  };
}

/** Runs every registered provider and composes the result. */
export function scoreProduct(providers: FactorProvider[], context: ScoringContext): CompositeScore {
  return composeScore(providers.map((p) => p.evaluate(context)));
}

/**
 * A provider for a factor nothing can currently answer.
 *
 * Used to keep all six factors present and visible on the product page while
 * their data sources are still open research questions. The user sees the
 * factor and the honest reason it is blank, rather than five factors and a
 * silent omission.
 */
export function unavailableFactor(
  key: ScoreFactorKey,
  label: string,
  reason: string
): FactorProvider {
  return {
    key,
    label,
    weight: SCORE_WEIGHTS[key],
    evaluate: () => ({ key, label, weight: SCORE_WEIGHTS[key], score: null, detail: reason }),
  };
}
