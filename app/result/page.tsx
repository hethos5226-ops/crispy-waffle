import { analyzeQuery } from "@/lib/analyze";
import { ResultView } from "@/components/ResultView";
import { EmptyState } from "@/components/EmptyState";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <EmptyState
        heading="What are you looking for?"
        message="Enter a product name or paste a product URL to get a BuyWise recommendation."
      />
    );
  }

  const analysis = await analyzeQuery(query);

  if (!analysis) {
    return (
      <EmptyState
        heading={`No match for "${query}"`}
        message="The MVP catalog covers a handful of TVs, headphones, phones, laptops and monitors. Try one of these instead:"
      />
    );
  }

  return (
    <main className="px-6 py-8">
      <ResultView analysis={analysis} />
    </main>
  );
}
