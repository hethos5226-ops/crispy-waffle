"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ebaySource } from "@/lib/data/ebay/source";
import { analyzeListing } from "@/lib/listingAnalysis";
import type { Listing } from "@/lib/data/listing";
import { ListingResultView } from "@/components/ListingResultView";
import { ResultSkeleton } from "@/components/ResultSkeleton";
import { ApiErrorState } from "@/components/ApiErrorState";
import { EmptyState } from "@/components/EmptyState";

interface Outcome {
  key: string;
  listing?: Listing | null;
  peers?: Listing[];
  error?: unknown;
}

/**
 * Loads one real listing plus a set of comparable listings, the latter being
 * what gives the price factor something honest to measure against.
 *
 * Reads the id from a query param rather than a path segment because the app
 * ships as a static export — arbitrary eBay ids can't be pre-rendered.
 */
export function ListingClient() {
  const searchParams = useSearchParams();
  const id = (searchParams.get("id") ?? "").trim();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const key = `${id}::${attempt}`;

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    (async () => {
      try {
        const listing = await ebaySource.getById(id, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!listing) {
          setOutcome({ key, listing: null });
          return;
        }

        // Comparable listings come from searching this listing's own title.
        // A failure here costs price context but shouldn't sink the page.
        let peers: Listing[] = [];
        try {
          const search = await ebaySource.search(listing.title, { limit: 12, signal: controller.signal });
          peers = search.listings;
        } catch {
          peers = [];
        }

        if (!controller.signal.aborted) setOutcome({ key, listing, peers });
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        setOutcome({ key, error });
      }
    })();

    return () => controller.abort();
  }, [key, id]);

  if (!id) {
    return (
      <EmptyState
        heading="No listing selected"
        message="Search for a product and pick a listing to see its BuyWise breakdown."
      />
    );
  }

  if (outcome?.key !== key) {
    return (
      <main className="px-6 py-8">
        <ResultSkeleton />
      </main>
    );
  }

  if (outcome.error !== undefined) {
    return <ApiErrorState error={outcome.error} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  if (!outcome.listing) {
    return (
      <EmptyState
        heading="Listing not found"
        message="It may have sold or been removed from eBay. Try searching for the product again."
      />
    );
  }

  return (
    <main className="px-6 py-8">
      <ListingResultView analysis={analyzeListing(outcome.listing, outcome.peers ?? [])} />
    </main>
  );
}
