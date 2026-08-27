import type { PriceAnalysis, Product } from "@/lib/types";
import { TagIcon } from "@/components/icons";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { ExpandablePrice } from "@/components/ExpandablePrice";
import { buildPriceHistory } from "@/lib/priceHistory";
import { buildPriceDetail } from "@/lib/priceDetail";

const STANDING_LABEL: Record<PriceAnalysis["standing"], string> = {
  cheap: "Cheap right now",
  normal: "Normal price",
  expensive: "Expensive right now",
};

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PriceCard({ product, analysis }: { product: Product; analysis: PriceAnalysis }) {
  const { price } = product;
  const pct = Math.round(Math.abs(analysis.percentBelowTypical));
  const tone = analysis.standing === "cheap" ? "buy" : analysis.standing === "expensive" ? "dont" : "wait";
  const history = buildPriceHistory(product);
  const detail = buildPriceDetail(product);
  const fmt = (v: number) => formatPrice(v, price.currency);

  return (
    <div
      className="rounded-[22px] border border-border bg-surface p-5 sm:p-6"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <ExpandablePrice
        label="Current price"
        value={fmt(price.current)}
        source={detail.source}
        trailing={
          <span
            className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `var(--${tone}-soft)`, color: `var(--${tone})` }}
          >
            <TagIcon className="h-3.5 w-3.5" />
            {STANDING_LABEL[analysis.standing]}
          </span>
        }
        rows={[
          { label: "Best price today", value: fmt(detail.current), meta: `at ${detail.source}`, tone: "buy" },
          { label: "Typical price", value: fmt(detail.typical) },
          { label: "Lowest tracked", value: fmt(detail.low), meta: formatDate(detail.lowDate), tone: "buy" },
          { label: "Highest tracked", value: fmt(detail.high), meta: formatDate(detail.highDate), tone: "dont" },
          {
            label: "vs typical",
            value:
              analysis.standing === "normal"
                ? "About the same"
                : analysis.percentBelowTypical > 0
                  ? `${pct}% cheaper`
                  : `${pct}% dearer`,
            tone,
          },
        ]}
        note={`Compared across ${detail.comparedCount} retailers, tracked since ${formatDate(detail.windowStart)}. Demo data, not live pricing.`}
      />

      <PriceHistoryChart history={history} typical={price.typical} currency={price.currency} tone={tone} />

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted">
        <span>
          Typical price: <span className="font-medium text-foreground">{fmt(price.typical)}</span>
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
