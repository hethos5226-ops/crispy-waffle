import type { PriceAnalysis, PriceStanding, Product, ProductAnalysis, ScoreFactor, Verdict } from "@/lib/types";
import { getById } from "@/lib/data/products";

const CHEAP_THRESHOLD = 8; // % below typical price
const EXPENSIVE_THRESHOLD = -8; // % below typical price (negative = above typical)

/**
 * How much each factor contributes to the composite BuyWise Score. Price
 * and overall value stay the largest single factor; the rest are initial
 * weights meant to be retuned once real warranty/age/review data is
 * flowing in. Change the numbers here — nothing else needs to change.
 */
export const SCORE_WEIGHTS: Record<ScoreFactor["key"], number> = {
  price: 0.3,
  reviews: 0.25,
  reliability: 0.15,
  alternatives: 0.1,
  warranty: 0.1,
  age: 0.1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function analyzePrice(product: Product): PriceAnalysis {
  const { current, typical } = product.price;
  const percentBelowTypical = ((typical - current) / typical) * 100;

  let standing: PriceStanding = "normal";
  if (percentBelowTypical >= CHEAP_THRESHOLD) standing = "cheap";
  else if (percentBelowTypical <= EXPENSIVE_THRESHOLD) standing = "expensive";

  return { standing, percentBelowTypical };
}

function describePrice(price: PriceAnalysis): string {
  const pct = Math.abs(Math.round(price.percentBelowTypical));
  if (price.standing === "cheap") {
    return `The current price is approximately ${pct}% below its typical price.`;
  }
  if (price.standing === "expensive") {
    return `The current price is approximately ${pct}% above its typical price.`;
  }
  return "The current price is close to its typical price.";
}

/**
 * Lightweight, non-recursive score used only to compare a product against
 * its own alternative. Keeps the "Alternatives" factor from recursing into
 * the alternative's own alternative-of score (they point back at each
 * other in the mock catalog).
 */
function quickScore(product: Product): number {
  const price = analyzePrice(product);
  const priceScore = clamp(60 + price.percentBelowTypical * 2, 0, 100);
  const reviewScore = product.reviews.sentimentScore;
  const penalty = Math.min(product.reviews.complaints.length * 2, 8);
  return Math.round(clamp(priceScore * 0.5 + reviewScore * 0.5 - penalty, 0, 100));
}

function scorePriceValue(price: PriceAnalysis): number {
  return Math.round(clamp(60 + price.percentBelowTypical * 2, 0, 100));
}

function scoreReviewsQuality(product: Product): number {
  return product.reviews.sentimentScore;
}

/**
 * Deliberately independent of review sentiment — driven only by how many
 * recurring complaints show up, so Reliability never double-counts the
 * same signal Reviews & Quality already captures.
 */
function scoreReliability(product: Product): number {
  const n = product.reviews.complaints.length;
  return Math.round(clamp(100 - n * 11, 30, 100));
}

function scoreAlternativesFactor(product: Product, skip: boolean): { score: number; detail: string } {
  if (skip) {
    return { score: 82, detail: "Not compared against further alternatives, to avoid double-counting." };
  }
  const alt = product.alternativeId ? getById(product.alternativeId) : null;
  if (!alt) {
    return { score: 82, detail: "No alternative identified in this category yet." };
  }
  const altQuick = quickScore(alt);
  const selfQuick = quickScore(product);
  const diff = altQuick - selfQuick;
  const score = Math.round(clamp(90 - Math.max(0, diff) * 1.8, 25, 95));
  const detail =
    diff > 4
      ? `${alt.name} compares favorably on price and reviews (${altQuick} vs ${selfQuick}) — worth a look before buying this one.`
      : `No meaningfully better alternative found nearby — this compares well against ${alt.name} (${selfQuick} vs ${altQuick}).`;
  return { score, detail };
}

function scoreWarranty(product: Product): { score: number | null; detail: string } {
  const w = product.warranty;
  if (!w) {
    return { score: null, detail: "Not available — no reliable warranty data for this listing yet." };
  }
  const raw =
    50 + clamp((w.months - 12) * 2.2, -20, 45) + (w.type === "manufacturer" ? 8 : 0) - (w.limitations ? 6 : 0);
  const score = Math.round(clamp(raw, 20, 100));
  const detail = `${w.months}-month ${w.type} warranty${w.limitations ? " — " + w.limitations : "."}`;
  return { score, detail };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function scoreAge(product: Product): { score: number | null; detail: string } {
  const r = product.release;
  if (!r) {
    return { score: null, detail: "Not available — no reliable release-date data for this listing yet." };
  }
  const now = new Date();
  const ageMonths = (now.getFullYear() - r.year) * 12 + (now.getMonth() + 1 - r.month);
  let raw = clamp(100 - Math.max(0, ageMonths - 6) * 1.1, 25, 100);
  if (product.newerModelAvailable) raw -= 14;
  const score = Math.round(clamp(raw, 15, 100));
  const detail = `Released ${MONTH_NAMES[r.month - 1]} ${r.year}${
    product.newerModelAvailable ? " — a newer generation has since replaced it." : " — still the current generation."
  }`;
  return { score, detail };
}

interface Breakdown {
  factors: ScoreFactor[];
  composite: number;
  price: PriceAnalysis;
  weightRedistributed: boolean;
}

/**
 * Weighted, multi-factor score (see SCORE_WEIGHTS). Any factor without
 * reliable data comes back with `score: null` and is excluded from the
 * composite — its weight is redistributed across the remaining factors
 * rather than assumed, per product principle: never fabricate.
 */
function computeBreakdown(product: Product, opts: { skipAlternative?: boolean } = {}): Breakdown {
  const price = analyzePrice(product);
  const alt = scoreAlternativesFactor(product, Boolean(opts.skipAlternative));
  const warranty = scoreWarranty(product);
  const age = scoreAge(product);

  const factors: ScoreFactor[] = [
    { key: "price", label: "Price & Value", weight: SCORE_WEIGHTS.price, score: scorePriceValue(price), detail: describePrice(price) },
    {
      key: "reviews",
      label: "Reviews & Quality",
      weight: SCORE_WEIGHTS.reviews,
      score: scoreReviewsQuality(product),
      detail: `${product.reviews.sentimentScore}/100 aggregate sentiment from customer reviews.`,
    },
    {
      key: "reliability",
      label: "Reliability",
      weight: SCORE_WEIGHTS.reliability,
      score: scoreReliability(product),
      detail: `${product.reviews.complaints.length} recurring complaint${product.reviews.complaints.length === 1 ? "" : "s"} identified across reviews.`,
    },
    { key: "alternatives", label: "Alternatives", weight: SCORE_WEIGHTS.alternatives, score: alt.score, detail: alt.detail },
    { key: "warranty", label: "Warranty", weight: SCORE_WEIGHTS.warranty, score: warranty.score, detail: warranty.detail },
    { key: "age", label: "Product Age", weight: SCORE_WEIGHTS.age, score: age.score, detail: age.detail },
  ];

  const available = factors.filter((f) => f.score != null);
  const totalWeight = available.reduce((sum, f) => sum + f.weight, 0);
  const composite =
    totalWeight > 0 ? Math.round(available.reduce((sum, f) => sum + f.score! * f.weight, 0) / totalWeight) : 0;

  return { factors, composite, price, weightRedistributed: available.length < factors.length };
}

function verdictForScore(score: number): Verdict {
  if (score >= 75) return "BUY_NOW";
  if (score >= 50) return "WAIT";
  return "DONT_BUY";
}

function buildReasoning(
  product: Product,
  score: number,
  verdict: Verdict,
  price: PriceAnalysis,
  alternative: ProductAnalysis["alternative"]
): string {
  const sentences: string[] = [];

  if (verdict === "BUY_NOW") {
    sentences.push(`${product.name} is a strong pick right now.`);
  } else if (verdict === "WAIT") {
    sentences.push(`${product.name} is solid but not a clear buy at this exact moment.`);
  } else {
    sentences.push(`${product.name} is hard to recommend right now.`);
  }

  sentences.push(describePrice(price));

  const topPositive = product.reviews.positives[0];
  const topComplaint = product.reviews.complaints[0];
  if (topPositive) sentences.push(`Owners consistently highlight ${topPositive.toLowerCase()}.`);
  if (topComplaint) sentences.push(`The most common complaint is ${topComplaint.toLowerCase()}.`);

  if (alternative) {
    if (alternative.score > score + 4) {
      sentences.push(
        `${alternative.product.name} scores higher (${alternative.score}/100) and is worth considering as an alternative.`
      );
    } else if (verdict === "BUY_NOW") {
      sentences.push(`${alternative.product.name} is a reasonable alternative if you want to compare options.`);
    }
  }

  return sentences.join(" ");
}

export function analyzeProduct(product: Product, alternativeProduct: Product | null): ProductAnalysis {
  const { factors, composite, price, weightRedistributed } = computeBreakdown(product);
  const verdict = verdictForScore(composite);

  let alternative: ProductAnalysis["alternative"] = null;
  if (alternativeProduct) {
    const altBreakdown = computeBreakdown(alternativeProduct, { skipAlternative: true });
    alternative = {
      product: alternativeProduct,
      score: altBreakdown.composite,
      verdict: verdictForScore(altBreakdown.composite),
    };
  }

  const reasoning = buildReasoning(product, composite, verdict, price, alternative);

  return { product, score: composite, verdict, price, reasoning, alternative, factors, weightRedistributed };
}
