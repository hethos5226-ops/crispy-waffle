"use client";

import Link from "next/link";
import type { ListingAnalysis } from "@/lib/listingAnalysis";
import { RETAILER_LABELS, conditionLabel } from "@/lib/data/listing";
import { VerdictHero } from "@/components/VerdictHero";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { AiSummaryCard } from "@/components/AiSummaryCard";
import { ExpandablePrice } from "@/components/ExpandablePrice";
import { DataUnavailable } from "@/components/DataUnavailable";
import { ListingImage } from "@/components/ListingImage";
import { DetailSubBar } from "@/components/DetailSubBar";
import { RecordVisit } from "@/components/RecordVisit";
import { toSnapshot } from "@/lib/data/snapshot";
import { formatPriceWithCurrency } from "@/lib/money";
import { ExternalLinkIcon, StoreIcon, CheckCircleIcon, StarIcon, StarOutlineIcon } from "@/components/icons";

/**
 * The real-listing counterpart to ResultView. Deliberately uses the same
 * cards, spacing and order as the demo view so switching to live data
 * doesn't change how BuyWise looks.
 */
export function ListingResultView({ analysis }: { analysis: ListingAnalysis }) {
  const { listing, score, verdict, factors, weightRedistributed, priceContext, alternative } = analysis;
  const snapshot = toSnapshot(listing, score != null && verdict != null ? { score, verdict } : null);
  const fmt = (v: number) => formatPriceWithCurrency(v, listing.currency);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-16">
      <RecordVisit snapshot={snapshot} />
      <DetailSubBar snapshot={snapshot} />

      {/* Identity */}
      <div className="flex items-center gap-4">
        <ListingImage listing={listing} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" sizes="80px" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted">
            {listing.brand ?? RETAILER_LABELS[listing.retailer]}
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold">
              {conditionLabel(listing)}
            </span>
          </p>
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">{listing.title}</h1>
        </div>
      </div>

      <VerdictHero score={score} verdict={verdict} />

      <ScoreBreakdown factors={factors} weightRedistributed={weightRedistributed} />

      <AiSummaryCard reasoning={analysis.reasoning} />

      {/* Price */}
      <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-6" style={{ boxShadow: "var(--card-shadow)" }}>
        <ExpandablePrice
          label="Current price"
          value={fmt(listing.price)}
          source={RETAILER_LABELS[listing.retailer]}
          rows={
            priceContext
              ? [
                  { label: "This listing", value: fmt(listing.price), tone: "buy" },
                  { label: `Median of ${priceContext.comparedCount} comparable`, value: fmt(priceContext.median) },
                  { label: "Cheapest comparable", value: fmt(priceContext.low), tone: "buy" },
                  { label: "Dearest comparable", value: fmt(priceContext.high), tone: "dont" },
                ]
              : [{ label: "This listing", value: fmt(listing.price) }]
          }
          note={
            priceContext
              ? `Compared against ${priceContext.comparedCount} current ${conditionLabel(listing).toLowerCase()} listings on eBay. This is today's spread, not price history — eBay doesn't publish that.`
              : "Not enough comparable listings to put this price in context."
          }
        />

        <div className="mt-4 border-t border-border pt-4">
          <DataUnavailable
            what="Price history"
            why="eBay's API doesn't expose historical pricing, so there's no past trend to chart. Connecting a price-tracking source would fill this in."
          />
        </div>
      </div>

      {/* Reviews — only what eBay actually publishes */}
      <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-6" style={{ boxShadow: "var(--card-shadow)" }}>
        <h2 className="flex items-center gap-1.5 text-[14.5px] font-bold">
          <CheckCircleIcon className="h-4 w-4 text-muted" />
          Reviews
        </h2>

        {listing.rating ? (
          <>
            <div className="mt-3 flex items-center gap-3.5">
              <span className="text-[34px] font-extrabold tabular-nums tracking-tight">
                {listing.rating.average.toFixed(1)}
              </span>
              <div>
                <div className="flex gap-0.5 text-wait">
                  {Array.from({ length: 5 }, (_, i) =>
                    i + 1 <= Math.round(listing.rating!.average) ? (
                      <StarIcon key={i} className="h-[15px] w-[15px]" />
                    ) : (
                      <StarOutlineIcon key={i} className="h-[15px] w-[15px]" />
                    )
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {listing.rating.count.toLocaleString()} eBay product review
                  {listing.rating.count === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <DataUnavailable
                what="Review text"
                why="eBay publishes the rating but not the written reviews, so there's nothing to summarise into likes and complaints yet."
              />
            </div>
          </>
        ) : (
          <div className="mt-3">
            <DataUnavailable
              what="Ratings and reviews"
              why="This listing isn't matched to an eBay catalog product, so eBay publishes no rating or reviews for it."
            />
          </div>
        )}
      </div>

      {/* Where to buy — the real listing */}
      <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-6" style={{ boxShadow: "var(--card-shadow)" }}>
        <h2 className="flex items-center gap-1.5 text-[14.5px] font-bold">
          <StoreIcon className="h-4 w-4 text-muted" />
          Where to buy
        </h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable flex items-center gap-1.5 text-sm font-semibold text-link hover:underline"
          >
            View on {RETAILER_LABELS[listing.retailer]}
            <ExternalLinkIcon className="h-3 w-3 shrink-0 opacity-80" />
          </a>
          <span className="shrink-0 text-[14.5px] font-bold tabular-nums">{fmt(listing.price)}</span>
        </div>
        {listing.seller && (
          <p className="mt-2.5 border-t border-border pt-2.5 text-[12.5px] text-muted">
            Sold by {listing.seller.name}
            {listing.seller.feedbackPercentage != null && (
              <> · {listing.seller.feedbackPercentage}% positive feedback</>
            )}
            {listing.seller.feedbackScore != null && <> ({listing.seller.feedbackScore.toLocaleString()} ratings)</>}
          </p>
        )}
      </div>

      {alternative && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Cheaper comparable listing</h2>
          <Link
            href={`/listing/?id=${encodeURIComponent(alternative.id)}`}
            className="pressable flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <ListingImage listing={alternative} className="h-14 w-14 shrink-0" sizes="56px" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold">{alternative.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {fmt(alternative.price)} · {conditionLabel(alternative)}
              </p>
            </div>
          </Link>
        </div>
      )}

      <p className="pt-2 text-center text-xs leading-relaxed text-muted">
        Live listing data from eBay. Price and availability change often — check the listing before buying.
      </p>
    </div>
  );
}
