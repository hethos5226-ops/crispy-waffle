import type { Product } from "@/lib/types";
import { CheckCircleIcon, AlertCircleIcon, SparkleIcon, StarIcon, StarOutlineIcon, StoreIcon } from "@/components/icons";
import { Disclosure } from "@/components/Disclosure";
import { buildReviews } from "@/lib/reviews";

function Stars({ rating, small }: { rating: number; small?: boolean }) {
  const size = small ? "h-3 w-3" : "h-[15px] w-[15px]";
  return (
    <div className={`flex text-wait ${small ? "gap-px" : "gap-0.5"}`}>
      {Array.from({ length: 5 }, (_, i) =>
        i + 1 <= Math.round(rating) ? <StarIcon key={i} className={size} /> : <StarOutlineIcon key={i} className={size} />
      )}
    </div>
  );
}

function relativeTime(daysAgo: number): string {
  if (daysAgo < 1) return "today";
  if (daysAgo < 2) return "yesterday";
  if (daysAgo < 30) return `${Math.floor(daysAgo)}d ago`;
  if (daysAgo < 365) return `${Math.floor(daysAgo / 30)}mo ago`;
  return `${Math.floor(daysAgo / 365)}y ago`;
}

export function ReviewsSection({ product }: { product: Product }) {
  const summary = buildReviews(product);
  const visible = summary.items.slice(0, 3);
  const rest = summary.items.slice(3);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6" style={{ boxShadow: "var(--card-shadow)" }}>
      <h2 className="flex items-center gap-1.5 text-[14.5px] font-bold">
        <CheckCircleIcon className="h-4 w-4 text-muted" />
        Reviews
      </h2>

      <div className="mt-3 flex items-center gap-3.5">
        <span className="text-[34px] font-extrabold tracking-tight tabular-nums">{summary.average}</span>
        <div>
          <Stars rating={summary.average} />
          <p className="mt-0.5 text-[12.5px] text-muted">{summary.count.toLocaleString()} reviews (demo)</p>
        </div>
      </div>

      <div>
        {visible.map((r) => (
          <ReviewItem key={`${r.author}-${r.daysAgo}`} review={r} />
        ))}
      </div>

      {rest.length > 0 && (
        <Disclosure trigger={<span>See all {summary.items.length} reviews</span>}>
          {rest.map((r) => (
            <ReviewItem key={`${r.author}-${r.daysAgo}`} review={r} />
          ))}
        </Disclosure>
      )}

      <p className="mt-2.5 border-t border-dashed border-border pt-2.5 text-xs text-muted">
        Aggregated and AI-summarized from customer reviews collected across the retailers listed below (demo data, not live).
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-buy">
            <CheckCircleIcon className="h-4 w-4" />
            What people like
          </h3>
          <ul className="space-y-2.5 text-[13.5px] leading-snug">
            {product.reviews.positives.map((point) => (
              <li key={point} className="flex gap-2">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-buy" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-dont">
            <AlertCircleIcon className="h-4 w-4" />
            Common complaints
          </h3>
          <ul className="space-y-2.5 text-[13.5px] leading-snug">
            {product.reviews.complaints.map((point) => (
              <li key={point} className="flex gap-2">
                <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-dont" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted">
        <SparkleIcon className="h-3 w-3" />
        Summarized to 3 key points each by BuyWise AI.
      </p>
    </div>
  );
}

function ReviewItem({ review }: { review: ReturnType<typeof buildReviews>["items"][number] }) {
  return (
    <div className="border-t border-border py-3.5 first:border-t-0 first:pt-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[13.5px] font-semibold">{review.author}</span>
        <span className="text-xs text-muted">{relativeTime(review.daysAgo)}</span>
      </div>
      <Stars rating={review.rating} small />
      <p className="mt-0.5 text-[13.5px] leading-snug">{review.text}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
        <StoreIcon className="h-3 w-3" />
        via {review.source}
      </p>
    </div>
  );
}
