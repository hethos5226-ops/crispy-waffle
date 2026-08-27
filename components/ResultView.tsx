import type { ProductAnalysis } from "@/lib/types";
import { ProductGlyph } from "@/components/ProductGlyph";
import { ScoreDial } from "@/components/ScoreDial";
import { VerdictBadge } from "@/components/VerdictBadge";
import { PriceCard } from "@/components/PriceCard";
import { ReviewsSection } from "@/components/ReviewsSection";
import { RetailersSection } from "@/components/RetailersSection";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { AiSummaryCard } from "@/components/AiSummaryCard";
import { AlternativeCard } from "@/components/AlternativeCard";
import { DetailSubBar } from "@/components/DetailSubBar";
import { VERDICT_META } from "@/lib/verdict";

export function ResultView({ analysis }: { analysis: ProductAnalysis }) {
  const { product, score, verdict, price, alternative, factors, weightRedistributed } = analysis;
  const meta = VERDICT_META[verdict];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-16">
      <DetailSubBar productId={product.id} />

      {/* Identity */}
      <div className="flex items-center gap-4">
        <ProductGlyph category={product.category} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{product.brand}</p>
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">{product.name}</h1>
        </div>
      </div>

      {/* Hero verdict — the answer, immediately */}
      <div
        className="overflow-hidden rounded-3xl border border-border"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <div
          className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:p-8 sm:text-left"
          style={{ backgroundColor: meta.soft }}
        >
          <ScoreDial score={score} verdict={verdict} />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: meta.color }}>
              BuyWise Score
            </p>
            <div className="mt-1.5 flex justify-center sm:justify-start">
              <VerdictBadge verdict={verdict} />
            </div>
          </div>
        </div>
      </div>

      <ScoreBreakdown factors={factors} weightRedistributed={weightRedistributed} />

      <AiSummaryCard reasoning={analysis.reasoning} />

      <PriceCard product={product} analysis={price} />

      <ReviewsSection product={product} />

      <RetailersSection product={product} />

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

      <p className="pt-2 text-center text-xs text-muted">
        Demo data — BuyWise is showing illustrative pricing and review estimates, not live figures.
      </p>
    </div>
  );
}
