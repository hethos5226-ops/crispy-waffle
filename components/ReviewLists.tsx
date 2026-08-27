import type { ReviewData } from "@/lib/types";
import { CheckCircleIcon, AlertCircleIcon } from "@/components/icons";

export function ReviewLists({ reviews }: { reviews: ReviewData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div
        className="rounded-2xl border border-border bg-surface p-5"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-buy">
          <CheckCircleIcon className="h-4 w-4" />
          What people like
        </h3>
        <ul className="space-y-3 text-sm leading-snug">
          {reviews.positives.map((point) => (
            <li key={point} className="flex gap-2.5">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-buy" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="rounded-2xl border border-border bg-surface p-5"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-dont">
          <AlertCircleIcon className="h-4 w-4" />
          Common complaints
        </h3>
        <ul className="space-y-3 text-sm leading-snug">
          {reviews.complaints.map((point) => (
            <li key={point} className="flex gap-2.5">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-dont" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
