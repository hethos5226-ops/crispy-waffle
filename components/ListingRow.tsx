import Link from "next/link";
import type { Listing } from "@/lib/data/listing";
import { conditionLabel } from "@/lib/data/listing";
import { ListingImage } from "@/components/ListingImage";
import { ChevronRightIcon } from "@/components/icons";

/** Search-result row. Mirrors ProductRow so live and demo results look alike. */
export function ListingRow({ listing }: { listing: Listing }) {
  const price = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  }).format(listing.price);

  return (
    <Link
      href={`/listing/?id=${encodeURIComponent(listing.id)}`}
      className="pressable flex items-center gap-3.5 rounded-[20px] border border-border bg-surface p-3"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <ListingImage listing={listing} className="h-[52px] w-[52px] shrink-0" sizes="52px" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold">{listing.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
          <span className="font-semibold text-foreground">{price}</span>
          <span>·</span>
          <span className="truncate">{conditionLabel(listing)}</span>
        </p>
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
