import { productProvider } from "@/lib/data/provider";
import { analyzeProduct } from "@/lib/scoring";
import type { ProductAnalysis } from "@/lib/types";

export async function analyzeQuery(query: string): Promise<ProductAnalysis | null> {
  const product = await productProvider.search(query);
  if (!product) return null;
  return analyzeById(product.id);
}

export async function analyzeById(id: string): Promise<ProductAnalysis | null> {
  const product = await productProvider.getById(id);
  if (!product) return null;

  const alternativeProduct = product.alternativeId
    ? await productProvider.getById(product.alternativeId)
    : null;

  return analyzeProduct(product, alternativeProduct);
}
