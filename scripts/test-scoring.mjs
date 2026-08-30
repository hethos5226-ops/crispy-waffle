/**
 * Guarantees the BuyWise score must keep.
 *
 * The load-bearing one is the last group: **missing data must never make a
 * product look better.** Weight redistribution is honest arithmetic — it
 * scores the average of what is known — but the factors eBay can populate
 * (price, alternatives) are systematically the flattering ones, while the
 * factors it never supplies (warranty, product age) are the tempering ones.
 * Without a guard, not knowing improves the verdict, which is precisely
 * backwards for a buying assistant.
 *
 * Run with: npm test
 */
import {
  composeScore,
  verdictForScore,
  unavailableFactor,
  scoreProduct,
  MIN_CONFIDENCE_FOR_BUY,
} from "../lib/score/factors.ts";
import { SCORE_WEIGHTS } from "../lib/scoreWeights.ts";

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
}

const f = (key, weight, score) => ({ key, label: key, weight, score, detail: "" });
/** The six factors at their real weights, so tests reflect the real model. */
const six = (scores) => [
  f("price", SCORE_WEIGHTS.price, scores.price ?? null),
  f("reviews", SCORE_WEIGHTS.reviews, scores.reviews ?? null),
  f("reliability", SCORE_WEIGHTS.reliability, scores.reliability ?? null),
  f("alternatives", SCORE_WEIGHTS.alternatives, scores.alternatives ?? null),
  f("warranty", SCORE_WEIGHTS.warranty, scores.warranty ?? null),
  f("age", SCORE_WEIGHTS.age, scores.age ?? null),
];

// ---- The six factors are all present and weighted to 1.0 ----
check("six factors, weights sum to 1",
  Math.round(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0) * 100), 100);
check("every factor has a weight",
  Object.keys(SCORE_WEIGHTS).sort(),
  ["age", "alternatives", "price", "reliability", "reviews", "warranty"]);
check("all six survive composition even when unavailable",
  composeScore(six({ price: 80 })).factors.length, 6);

// ---- Missing data is never invented ----
check("an unavailable factor stays null, never defaulted",
  composeScore(six({ price: 80 })).factors.find((x) => x.key === "warranty").score, null);
check("unavailableFactor never produces a score",
  unavailableFactor("warranty", "Warranty", "no source").evaluate({}).score, null);
check("nothing scoreable yields null, not zero",
  composeScore(six({})).score, null);
check("...and no verdict at all",
  composeScore(six({})).verdict, null);
check("...and zero confidence",
  composeScore(six({})).confidence, 0);

// ---- Redistribution ----
check("weight redistributes across available factors",
  composeScore([f("price", 0.3, 80), f("reviews", 0.25, null), f("age", 0.1, 60)]).score, 75);
check("redistribution is flagged",
  composeScore(six({ price: 80 })).weightRedistributed, true);
check("nothing redistributed when all six are known",
  composeScore(six({ price: 80, reviews: 80, reliability: 80, alternatives: 80, warranty: 80, age: 80 })).weightRedistributed,
  false);
check("confidence equals the share of weight with real data",
  composeScore(six({ price: 80, reviews: 80 })).confidence, SCORE_WEIGHTS.price + SCORE_WEIGHTS.reviews);

// ---- THE GUARANTEE: missing data must not reward a product ----
// Reproduces the measured case. price + alternatives are exactly what the live
// eBay path can populate; warranty and age it can never populate.
const sparse = composeScore(six({ price: 90, alternatives: 90 }));
const full = composeScore(six({ price: 90, alternatives: 90, reviews: 40, reliability: 50, warranty: 60, age: 60 }));

check("thin evidence still scores high (arithmetic is honest)", sparse.score, 90);
check("but the verdict is NOT a buy", sparse.verdict, "WAIT");
check("...and says it was held back for lack of evidence", sparse.verdictLimitedByConfidence, true);
check("knowing more must never turn a WAIT into a worse verdict than ignorance",
  full.verdict === "WAIT" && sparse.verdict === "WAIT", true);
check("ignorance cannot outrank knowledge",
  !(sparse.verdict === "BUY_NOW" && full.verdict !== "BUY_NOW"), true);

// A well-evidenced product is still allowed to be a buy.
const evidenced = composeScore(six({ price: 90, reviews: 85, reliability: 80, alternatives: 90 }));
check("a well-evidenced product can still say BUY NOW", evidenced.verdict, "BUY_NOW");
check("...and is not flagged as limited", evidenced.verdictLimitedByConfidence, false);

// The cap is one-directional: thin evidence may still warn.
const thinAndBad = composeScore(six({ price: 10, alternatives: 20 }));
check("thin evidence may still say DON'T BUY", thinAndBad.verdict, "DONT_BUY");

// The boundary itself.
check("exactly at the confidence floor a buy is allowed",
  composeScore([f("a", MIN_CONFIDENCE_FOR_BUY, 90), f("b", 1 - MIN_CONFIDENCE_FOR_BUY, null)]).verdict,
  "BUY_NOW");
check("just below the floor it is not",
  composeScore([f("a", MIN_CONFIDENCE_FOR_BUY - 0.01, 90), f("b", 1 - MIN_CONFIDENCE_FOR_BUY + 0.01, null)]).verdict,
  "WAIT");

// ---- Verdict thresholds ----
check("75 is BUY_NOW", verdictForScore(75), "BUY_NOW");
check("74 is WAIT", verdictForScore(74), "WAIT");
check("50 is WAIT", verdictForScore(50), "WAIT");
check("49 is DONT_BUY", verdictForScore(49), "DONT_BUY");

// ---- The provider seam ----
check("scoreProduct runs providers and composes",
  scoreProduct(
    [unavailableFactor("warranty", "Warranty", "no source"), unavailableFactor("age", "Product Age", "no source")],
    { subject: null, comparables: [], now: new Date(0) }
  ).score,
  null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
