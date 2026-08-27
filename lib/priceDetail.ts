import type { Product } from "@/lib/types";
import { buildPriceHistory } from "@/lib/priceHistory";
import { buildRetailers } from "@/lib/retailers";

export interface PriceDetail {
  current: number;
  typical: number;
  currency: string;
  /** Lowest/highest seen across the tracked window. */
  low: number;
  high: number;
  lowDate: Date;
  highDate: Date;
  /** Retailer the headline price comes from (the cheapest listing). */
  source: string;
  /** How many retailers were compared to produce it. */
  comparedCount: number;
  windowStart: Date;
}

/**
 * Everything needed to explain a headline price — where it came from and how
 * it sits against the tracked range. Derived from the same demo generators
 * that produce the chart and retailer list, so the numbers always agree.
 */
export function buildPriceDetail(product: Product): PriceDetail {
  const history = buildPriceHistory(product);
  const retailers = buildRetailers(product);

  let low = history[0];
  let high = history[0];
  for (const point of history) {
    if (point.price < low.price) low = point;
    if (point.price > high.price) high = point;
  }

  return {
    current: product.price.current,
    typical: product.price.typical,
    currency: product.price.currency,
    low: low.price,
    high: high.price,
    lowDate: low.date,
    highDate: high.date,
    source: retailers[0].name,
    comparedCount: retailers.length,
    windowStart: history[0].date,
  };
}
