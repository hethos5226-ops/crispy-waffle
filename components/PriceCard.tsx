import type { PriceAnalysis, Product } from "@/lib/types";
import { TagIcon } from "@/components/icons";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { buildPriceHistory } from "@/lib/priceHistory";

const STANDING_LABEL: Record<PriceAnalysis["standing"], string> = {
  cheap: "Cheap right now",
  normal: "Normal price",
  expensive: "Expensive right now",
};

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function PriceCard({ product, analysis }: { product: Product; analysis: PriceAnalysis }) {
  const { price } = product;
  const pct = Math.round(Math.abs(analysis.percentBelowTypical));
  const tone = analysis.standing === "cheap" ? "buy" : analysis.standing === "expensive" ? "dont" : "wait";
  const history = buildPriceHistory(product);

  return (
    <div
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Current price</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">
            {formatPrice(price.current, price.currency)}
          </p>
        </div>
        <span
          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `var(--${tone}-soft)`, color: `var(--${tone})` }}
        >
          <TagIcon className="h-3.5 w-3.5" />
          {STANDING_LABEL[analysis.standing]}
        </span>
      </div>

      <PriceHistoryChart history={history} typical={price.typical} currency={price.currency} tone={tone} />

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted">
        <span>
          Typical price: <span className="font-medium text-foreground">{formatPrice(price.typical, price.currency)}</span>
        </span>
        {analysis.standing !== "normal" && (
          <>
            <span className="text-border">·</span>
            <span className="font-medium" style={{ color: `var(--${tone})` }}>
              {analysis.percentBelowTypical > 0 ? `${pct}% below typical` : `${pct}% above typical`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
