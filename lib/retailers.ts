import type { Product, RetailerListing } from "@/lib/types";
import { mulberry32, seedFromString } from "@/lib/random";

/**
 * Fictitious retailer names — deliberately not real store names, since
 * pairing invented prices with a real retailer would misrepresent that
 * retailer's actual pricing. Swap for real marketplace listings later.
 */
export const RETAILER_NAMES = [
  "Northfield Electronics",
  "ByteHouse",
  "Circuit & Co.",
  "Everstock Goods",
  "Fenwick Home",
  "Priceline Tech",
  "Corestore",
];

/** Seeded Fisher-Yates — unlike `sort(() => rand() - 0.5)`, this calls the
 * RNG a fixed, engine-independent number of times, so the result is
 * identical between the server render and the client hydration. */
function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** DEMO DATA — a few illustrative retailer prices, cheapest first, deterministic per product. */
export function buildRetailers(product: Product): RetailerListing[] {
  const rand = mulberry32(seedFromString(product.id + "-retail"));
  const shuffled = seededShuffle(RETAILER_NAMES, rand);
  const count = 3 + Math.floor(rand() * 2);
  const picks = shuffled.slice(0, count);
  const current = product.price.current;

  const list = picks.map((name, i) => ({
    name,
    price: i === 0 ? current : current + Math.round(current * (0.02 + rand() * 0.09)),
  }));
  list.sort((a, b) => a.price - b.price);
  return list;
}
