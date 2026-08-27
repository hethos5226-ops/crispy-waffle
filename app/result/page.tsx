import Link from "next/link";
import { analyzeQuery } from "@/lib/analyze";
import { ResultView } from "@/components/ResultView";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return <EmptyState message="Enter a product name or URL to get a recommendation." />;
  }

  const analysis = await analyzeQuery(query);

  if (!analysis) {
    return (
      <EmptyState
        message={`BuyWise doesn't recognize "${query}" yet. The MVP catalog covers a handful of TVs, headphones, phones, laptops and monitors — try one of the examples on the home page.`}
      />
    );
  }

  return (
    <main className="flex-1 px-6 py-12">
      <ResultView analysis={analysis} />
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="max-w-md text-muted">{message}</p>
      <Link href="/" className="text-sm font-semibold underline underline-offset-4">
        Back to search
      </Link>
    </main>
  );
}
