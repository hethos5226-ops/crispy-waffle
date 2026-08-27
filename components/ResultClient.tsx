"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { analyzeQuery } from "@/lib/analyze";
import type { ProductAnalysis } from "@/lib/types";
import { ResultView } from "@/components/ResultView";
import { ResultSkeleton } from "@/components/ResultSkeleton";
import { EmptyState } from "@/components/EmptyState";

/**
 * Reads `q` on the client rather than as a server-side searchParams prop.
 * Renders identically either way — this just makes the page work without a
 * server present (static export / GitHub Pages), since `analyzeQuery` only
 * ever touches in-memory mock data and runs fine in the browser.
 */
export function ResultClient() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  // Keyed by the query it was computed for, so a stale result never renders
  // while a new query is loading.
  const [result, setResult] = useState<{ query: string; analysis: ProductAnalysis | null } | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    analyzeQuery(query).then((analysis) => {
      if (!cancelled) setResult({ query, analysis });
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!query) {
    return (
      <EmptyState
        heading="What are you looking for?"
        message="Enter a product name or paste a product URL to get a BuyWise recommendation."
      />
    );
  }

  if (!result || result.query !== query) {
    return (
      <main className="px-6 py-8">
        <ResultSkeleton />
      </main>
    );
  }

  if (!result.analysis) {
    return (
      <EmptyState
        heading={`No match for "${query}"`}
        message="The MVP catalog covers a handful of TVs, headphones, phones, laptops and monitors. Try one of these instead:"
      />
    );
  }

  return (
    <main className="px-6 py-8">
      <ResultView analysis={result.analysis} />
    </main>
  );
}
