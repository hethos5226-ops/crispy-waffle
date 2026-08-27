import type { Product } from "@/lib/types";
import { PRODUCTS } from "@/lib/data/products";

/**
 * Boundary between "where product/price/review data comes from" and the
 * rest of the app. The UI and scoring engine only ever talk to this
 * interface, so a future `LiveProductProvider` (real shopping/pricing/review
 * APIs) can replace `MockProductProvider` without any other code changing.
 */
export interface ProductProvider {
  search(query: string): Promise<Product | null>;
  getById(id: string): Promise<Product | null>;
  all(): Promise<Product[]>;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Very small best-effort extraction so a pasted product URL can still match the catalog. */
function tokensFromQuery(query: string): string[] {
  const trimmed = query.trim();
  const looksLikeUrl = /^https?:\/\//i.test(trimmed) || trimmed.includes("/");

  if (!looksLikeUrl) {
    return normalize(trimmed).split(" ").filter(Boolean);
  }

  try {
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    const pathWords = normalize(url.pathname.replace(/[-_/]/g, " "));
    const searchWords = normalize(Array.from(url.searchParams.values()).join(" "));
    return `${pathWords} ${searchWords}`.split(" ").filter((w) => w.length > 1);
  } catch {
    return normalize(trimmed).split(" ").filter(Boolean);
  }
}

function matchScore(product: Product, queryTokens: string[]): number {
  const haystack = normalize(
    [product.name, product.brand, ...product.aliases].join(" ")
  );
  let score = 0;
  for (const token of queryTokens) {
    if (token.length < 2) continue;
    if (haystack.includes(token)) score += token.length; // longer tokens (model numbers) count more
  }
  return score;
}

export class MockProductProvider implements ProductProvider {
  async all(): Promise<Product[]> {
    return PRODUCTS;
  }

  async getById(id: string): Promise<Product | null> {
    return PRODUCTS.find((p) => p.id === id) ?? null;
  }

  async search(query: string): Promise<Product | null> {
    const tokens = tokensFromQuery(query);
    if (tokens.length === 0) return null;

    let best: { product: Product; score: number } | null = null;
    for (const product of PRODUCTS) {
      const score = matchScore(product, tokens);
      if (score > 0 && (!best || score > best.score)) {
        best = { product, score };
      }
    }
    return best?.product ?? null;
  }
}

export const productProvider: ProductProvider = new MockProductProvider();
