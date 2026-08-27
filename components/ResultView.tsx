import type { ProductAnalysis } from "@/lib/types";
import { ProductGlyph } from "@/components/ProductGlyph";
import { ScoreDial } from "@/components/ScoreDial";
import { VerdictBadge } from "@/components/VerdictBadge";
import { PriceCard } from "@/components/PriceCard";
import { ReviewLists } from "@/components/ReviewLists";
import { AlternativeCard } from "@/components/AlternativeCard";

export function ResultView({ analysis }: { analysis: ProductAnalysis }) {
  const { product, score, verdict, price, reasoning, alternative } = analysis;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-16">
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <ProductGlyph category={product.category} className="h-28 w-28 sm:h-32 sm:w-32" />
          <div className="flex-1">
            <p className="text-sm text-muted">{product.brand}</p>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>
            <div className="mt-3 flex justify-center sm:justify-start">
              <VerdictBadge verdict={verdict} />
            </div>
          </div>
          <ScoreDial score={score} verdict={verdict} />
        </div>

        <p className="mt-6 border-t border-border pt-6 text-base leading-relaxed text-foreground">
          {reasoning}
        </p>
      </div>

      <PriceCard price={product.price} analysis={price} />

      <ReviewLists reviews={product.reviews} />

      {alternative && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Better alternative
          </h2>
          <AlternativeCard
            product={alternative.product}
            score={alternative.score}
            verdict={alternative.verdict}
          />
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Demo data — BuyWise is showing illustrative pricing and review estimates, not live figures.
      </p>
    </div>
  );
}
