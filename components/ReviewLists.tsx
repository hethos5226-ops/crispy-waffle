import type { ReviewData } from "@/lib/types";

export function ReviewLists({ reviews }: { reviews: ReviewData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-buy">What people like</h3>
        <ul className="space-y-2 text-sm">
          {reviews.positives.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="text-buy">+</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-dont">Common complaints</h3>
        <ul className="space-y-2 text-sm">
          {reviews.complaints.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="text-dont">−</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
