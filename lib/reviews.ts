import type { Product, Review, ReviewSummary } from "@/lib/types";
import { mulberry32, seedFromString } from "@/lib/random";
import { RETAILER_NAMES } from "@/lib/retailers";

const REVIEWER_NAMES = [
  "A. Kim",
  "J. Rossi",
  "M. Chen",
  "T. Patel",
  "S. Novak",
  "D. Alvarez",
  "R. Whitfield",
  "L. Nguyen",
  "O. Brandt",
  "E. Silva",
];

/**
 * DEMO DATA — individual reviews synthesized from the product's own
 * positives/complaints (so they never contradict the summary above them),
 * with a deterministic seed so the same product always shows the same
 * reviews. AI-summarized in the UI down to 3 positives / 3 complaints;
 * this is the underlying "raw" sample the summary is drawn from.
 */
export function buildReviews(product: Product): ReviewSummary {
  const rand = mulberry32(seedFromString(product.id + "-reviews"));
  const posPool = product.reviews.positives;
  const negPool = product.reviews.complaints;
  const total = 6;

  const items: Review[] = [];
  for (let i = 0; i < total; i++) {
    const leanPositive = rand() < product.reviews.sentimentScore / 100;
    const rating = leanPositive ? (rand() < 0.7 ? 5 : 4) : rand() < 0.5 ? 2 : 3;
    const pool = leanPositive ? posPool : negPool;
    const text = pool[i % pool.length];
    items.push({
      author: REVIEWER_NAMES[Math.floor(rand() * REVIEWER_NAMES.length)],
      rating,
      daysAgo: 4 + Math.floor(rand() * 85),
      source: RETAILER_NAMES[Math.floor(rand() * RETAILER_NAMES.length)],
      text: text.charAt(0).toUpperCase() + text.slice(1) + ".",
    });
  }
  items.sort((a, b) => a.daysAgo - b.daysAgo);

  const avgRaw = items.reduce((sum, r) => sum + r.rating, 0) / items.length;
  const average = Math.round(avgRaw * 10) / 10;
  const count = 60 + Math.floor(rand() * 340);

  return { items, average, count };
}
