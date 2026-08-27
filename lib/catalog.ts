import { PRODUCTS, getById } from "@/lib/data/products";
import { analyzeProduct } from "@/lib/scoring";
import type { Product, Verdict } from "@/lib/types";

export interface CatalogEntry {
  product: Product;
  score: number;
  verdict: Verdict;
}

/** Analyzes the full mock catalog once — cheap since it's only 11 products, computed server-side per request. */
export function analyzeCatalog(): CatalogEntry[] {
  return PRODUCTS.map((product) => {
    const alternative = product.alternativeId ? getById(product.alternativeId) : null;
    const analysis = analyzeProduct(product, alternative);
    return { product, score: analysis.score, verdict: analysis.verdict };
  });
}
