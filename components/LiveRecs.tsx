"use client";

import { useState } from "react";
import { useListingSearch } from "@/lib/useListingSearch";
import { useDebounced } from "@/lib/useDebounced";
import { useTodayLabel } from "@/lib/useToday";
import { ListingCard } from "@/components/ListingCard";
import { ApiErrorState } from "@/components/ApiErrorState";
import { FavoritesList } from "@/components/FavoritesList";
import { Wiz } from "@/components/Wiz";
import { SearchIcon } from "@/components/icons";
import { BROWSE_CATEGORIES, DEFAULT_CATEGORY } from "@/lib/data/categories";

function CardSkeleton() {
  return <div className="h-[100px] animate-pulse rounded-[20px] bg-surface-muted" />;
}

/**
 * The live product feed. Every listing here comes from eBay — typing searches
 * eBay, and the category chips are themselves eBay searches. There is no
 * demo catalog behind this: if eBay returns nothing, or the request fails,
 * the user is told so rather than shown invented products.
 */
export function LiveRecs() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY.id);
  const updatedLabel = useTodayLabel();

  const typed = useDebounced(query);
  const activeCategory = BROWSE_CATEGORIES.find((c) => c.id === category) ?? DEFAULT_CATEGORY;
  // A typed query wins; otherwise the selected chip drives the feed.
  const effectiveQuery = typed.trim() || activeCategory.query;
  const isSearching = typed.trim().length > 0;

  const { state, retry } = useListingSearch(effectiveQuery, { limit: 20 });

  return (
    <div>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-4 pr-1.5 transition-shadow focus-within:ring-2 focus-within:ring-foreground/10"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search eBay for a product…"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
        />
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {BROWSE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategory(c.id);
              setQuery("");
            }}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold pressable ${
              category === c.id && !isSearching
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-3 mt-7 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold uppercase tracking-wide text-muted">
          {isSearching ? `Results for “${typed.trim()}”` : `${activeCategory.label} on eBay`}
        </span>
        {!isSearching && <span className="text-[12.5px] font-semibold text-muted">Updated {updatedLabel}</span>}
      </div>

      {state.status === "loading" && (
        <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Searching eBay">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-[22px] border border-border bg-surface" style={{ boxShadow: "var(--card-shadow)" }}>
          <ApiErrorState error={state.error} onRetry={retry} />
        </div>
      )}

      {state.status === "ready" &&
        (state.listings.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {state.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-border px-5 py-9 text-center">
            <Wiz pose="magnify" size={84} />
            <div>
              <p className="text-[15px] font-bold">No results available right now</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
                {isSearching
                  ? `eBay returned no listings for “${typed.trim()}”. Try a different or broader search term.`
                  : "eBay returned no listings for this category right now. Try another category."}
              </p>
            </div>
          </div>
        ))}

      <FavoritesList />
    </div>
  );
}
