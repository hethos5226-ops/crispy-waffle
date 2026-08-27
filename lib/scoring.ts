import type { PriceAnalysis, PriceStanding, Product, ProductAnalysis, Verdict } from "@/lib/types";

const CHEAP_THRESHOLD = 8; // % below typical price
const EXPENSIVE_THRESHOLD = -8; // % below typical price (negative = above typical)

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

/** Price positioning contributes half the score, review sentiment the other half, with a small penalty for a heavy complaint list. */
function computeScore(product: Product, price: PriceAnalysis): number {
  const priceScore = clamp(60 + price.percentBelowTypical * 2, 0, 100);
  const reviewScore = product.reviews.sentimentScore;
  const complaintPenalty = Math.min(product.reviews.complaints.length * 2, 8);
  return Math.round(clamp(priceScore * 0.5 + reviewScore * 0.5 - complaintPenalty, 0, 100));
}

function verdictForScore(score: number): Verdict {
  if (score >= 75) return "BUY_NOW";
  if (score >= 50) return "WAIT";
  return "DONT_BUY";
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
  const price = analyzePrice(product);
  const score = computeScore(product, price);
  const verdict = verdictForScore(score);

  let alternative: ProductAnalysis["alternative"] = null;
  if (alternativeProduct) {
    const altPrice = analyzePrice(alternativeProduct);
    const altScore = computeScore(alternativeProduct, altPrice);
    alternative = { product: alternativeProduct, score: altScore, verdict: verdictForScore(altScore) };
  }

  const reasoning = buildReasoning(product, score, verdict, price, alternative);

  return { product, score, verdict, price, reasoning, alternative };
}
