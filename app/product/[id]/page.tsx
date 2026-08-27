import { notFound } from "next/navigation";
import { analyzeById } from "@/lib/analyze";
import { ResultView } from "@/components/ResultView";
import { PRODUCTS } from "@/lib/data/products";

// The catalog is a small, fixed list, so every product page can be
// pre-rendered at build time — required for a static export (GitHub Pages
// has no server to render a dynamic route on request).
export async function generateStaticParams() {
  return PRODUCTS.map((product) => ({ id: product.id }));
}
export const dynamicParams = false;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = await analyzeById(id);

  if (!analysis) notFound();

  return (
    <main className="px-6 py-8">
      <ResultView analysis={analysis} />
    </main>
  );
}
