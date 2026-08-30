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
  /** Share of total weight that had real data behind it, 0-1. */
  confidence: number;
}

const BUY_NOW_AT = 75;
const WAIT_AT = 50;

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
    return { score: null, verdict: null, factors, weightRedistributed: true, confidence: 0 };
  }

  const score = Math.round(
    available.reduce((sum, f) => sum + (f.score as number) * f.weight, 0) / availableWeight
  );

  return {
    score,
    verdict: verdictForScore(score),
    factors,
    weightRedistributed: available.length < factors.length,
    confidence: totalWeight === 0 ? 0 : availableWeight / totalWeight,
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
