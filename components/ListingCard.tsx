import Link from "next/link";
import type { Listing } from "@/lib/data/listing";
import { RETAILER_LABELS, conditionLabel } from "@/lib/data/listing";
import { ListingImage } from "@/components/ListingImage";
import { StarIcon, StarOutlineIcon, ChevronRightIcon } from "@/components/icons";
import { formatPriceWithCurrency } from "@/lib/money";

/**
 * A single eBay listing in a list.
 *
 * eBay populates its optional fields inconsistently — most listings have no
 * catalog rating, many have no brand, some have no seller feedback. The card
 * is built so each of those simply doesn't render rather than leaving a hole:
 * only price, title and the source badge are guaranteed. The one exception is
 * the rating, which shows an explicit "No rating" so an unrated listing isn't
 * mistaken for one that merely failed to load.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const price = formatPriceWithCurrency(listing.price, listing.currency);
  const rating = listing.rating;
  const seller = listing.seller;

  return (
    <Link
      href={`/listing/?id=${encodeURIComponent(listing.id)}`}
      className="pressable flex items-stretch gap-3.5 rounded-[20px] border border-border bg-surface p-3"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <ListingImage listing={listing} className="h-[68px] w-[68px] shrink-0 self-center" sizes="68px" />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* Source is always shown: it's the one thing that must never be ambiguous. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">
            {RETAILER_LABELS[listing.retailer]}
          </span>
          {/* Condition is always present (falls back to an explicit label). */}
          <span className="text-[11px] text-muted">{conditionLabel(listing)}</span>
          {/* Brand only when eBay supplied one. */}
          {listing.brand && (
            <>
              <span className="text-[11px] text-border">·</span>
              <span className="truncate text-[11px] text-muted">{listing.brand}</span>
            </>
          )}
        </div>

        <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug">{listing.title}</p>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-extrabold tabular-nums">{price}</span>

          {rating ? (
            <span className="flex items-center gap-1 text-[11.5px] text-muted">
              <StarIcon className="h-3 w-3 text-wait" />
              <span className="font-semibold text-foreground">{rating.average.toFixed(1)}</span>
              {rating.count > 0 && <span>({rating.count.toLocaleString()})</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11.5px] text-muted">
              <StarOutlineIcon className="h-3 w-3" />
              No rating
            </span>
          )}
        </div>

        {/* Seller line only renders when eBay gave us a seller. */}
        {seller && (
          <p className="truncate text-[11px] text-muted">
            {seller.name}
            {seller.feedbackPercentage != null && <> · {seller.feedbackPercentage}% positive</>}
          </p>
        )}
      </div>

      <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-muted" />
    </Link>
  );
}
