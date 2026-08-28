"use client";

import { useListingSearch } from "@/lib/useListingSearch";
import { ListingRow } from "@/components/ListingRow";
import { ApiErrorState } from "@/components/ApiErrorState";
import { ProductSourceError } from "@/lib/data/listing";

function RowSkeleton() {
  return <div className="h-[76px] animate-pulse rounded-[20px] bg-surface-muted" />;
}

/**
 * Live eBay results for the current query. Renders nothing at all when the
 * box is empty or live search isn't configured, so the page looks exactly as
 * it did before when there's nothing live to show.
 */
export function LiveResults({ query }: { query: string }) {
  const { state, retry, configured } = useListingSearch(query, { limit: 12 });

  if (!configured || state.status === "idle") return null;

  return (
    <div className="mb-2">
      <div className="mb-3 mt-7 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold uppercase tracking-wide text-muted">Live on eBay</span>
        {state.status === "ready" && state.listings.length > 0 && (
          <span className="text-[12.5px] font-semibold text-muted">
            {state.listings.length} listing{state.listings.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Searching eBay">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      )}

      {state.status === "error" && (
        // A misconfigured deployment is a quiet note, not a full error screen —
        // the rest of the page still works.
        state.error instanceof ProductSourceError && state.error.kind === "not_configured" ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-[13px] text-muted">
            Live eBay search isn&apos;t connected in this build.
          </p>
        ) : (
          <div className="rounded-[22px] border border-border bg-surface" style={{ boxShadow: "var(--card-shadow)" }}>
            <ApiErrorState error={state.error} onRetry={retry} />
          </div>
        )
      )}

      {state.status === "ready" &&
        (state.listings.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {state.listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-surface-muted p-4 text-[13px] text-muted">
            No eBay listings matched &ldquo;{state.query}&rdquo;. Try a different spelling or a broader term.
          </p>
        ))}
    </div>
  );
}
