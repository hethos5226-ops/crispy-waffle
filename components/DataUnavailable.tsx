import { AlertCircleIcon } from "@/components/icons";

/**
 * Marks a section whose data source isn't connected yet.
 *
 * Shown instead of demo content on real listings: eBay publishes no review
 * text, price history, warranty terms or release dates, and inventing them
 * next to a real price would misrepresent them as real.
 */
export function DataUnavailable({ what, why }: { what: string; why: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface-muted p-4">
      <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">{what} isn&apos;t available yet</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{why}</p>
      </div>
    </div>
  );
}
