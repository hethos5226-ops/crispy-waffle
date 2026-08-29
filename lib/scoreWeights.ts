import type { ScoreFactorKey } from "@/lib/types";

/**
 * How much each factor contributes to the composite BuyWise Score.
 *
 * Kept in its own module so the live, eBay-backed scoring path can import the
 * weights without pulling in the demo catalog that `lib/scoring.ts` (the
 * development-only mock scorer) depends on.
 *
 * Price and overall value stay the largest single factor; the rest are
 * initial values, meant to be retuned as real data accumulates.
 */
export const SCORE_WEIGHTS: Record<ScoreFactorKey, number> = {
  price: 0.3,
  reviews: 0.25,
  reliability: 0.15,
  alternatives: 0.1,
  warranty: 0.1,
  age: 0.1,
};
