import type { PriceHistoryPoint, Product } from "@/lib/types";
import { mulberry32, seedFromString } from "@/lib/random";

/**
 * DEMO DATA — a plausible-looking 10-week price trend ending exactly at
 * today's current price, generated deterministically per product. Stands
 * in for a real price-history feed; swap the implementation once one
 * exists without touching the chart component.
 */
export function buildPriceHistory(product: Product): PriceHistoryPoint[] {
  const rand = mulberry32(seedFromString(product.id + "-history"));
  const points = 10;
  const typical = product.price.typical;
  const current = product.price.current;
  const start = typical * (1 + (rand() - 0.5) * 0.05);

  const prices: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const base = start + (current - start) * Math.pow(t, 1.3);
    const noise = (rand() - 0.5) * typical * 0.025;
    prices.push(Math.max(1, Math.round(base + noise)));
  }
  prices[points - 1] = current;

  return prices.map((price, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (points - 1 - i) * 7);
    return { date, price };
  });
}
