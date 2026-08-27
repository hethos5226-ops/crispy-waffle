import type { PriceAnalysis, PriceInfo } from "@/lib/types";

const STANDING_LABEL: Record<PriceAnalysis["standing"], string> = {
  cheap: "Cheap right now",
  normal: "Normal price",
  expensive: "Expensive right now",
};

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function PriceCard({ price, analysis }: { price: PriceInfo; analysis: PriceAnalysis }) {
  const pct = Math.round(Math.abs(analysis.percentBelowTypical));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Current price</p>
          <p className="text-3xl font-bold">{formatPrice(price.current, price.currency)}</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor:
              analysis.standing === "cheap"
                ? "var(--buy-soft)"
                : analysis.standing === "expensive"
                  ? "var(--dont-soft)"
                  : "var(--wait-soft)",
            color:
              analysis.standing === "cheap"
                ? "var(--buy)"
                : analysis.standing === "expensive"
                  ? "var(--dont)"
                  : "var(--wait)",
          }}
        >
          {STANDING_LABEL[analysis.standing]}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        Typical price: {formatPrice(price.typical, price.currency)}
        {analysis.standing !== "normal" && (
          <>
            {" · "}
            {analysis.percentBelowTypical > 0 ? "" : "+"}
            {analysis.percentBelowTypical > 0 ? `${pct}% below typical` : `${pct}% above typical`}
          </>
        )}
      </p>
    </div>
  );
}
