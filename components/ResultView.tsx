import type { ProductAnalysis } from "@/lib/types";
import { ProductGlyph } from "@/components/ProductGlyph";
import { VerdictHero } from "@/components/VerdictHero";
import { PriceCard } from "@/components/PriceCard";
import { ReviewsSection } from "@/components/ReviewsSection";
import { RetailersSection } from "@/components/RetailersSection";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { AiSummaryCard } from "@/components/AiSummaryCard";
import { AlternativeCard } from "@/components/AlternativeCard";
import { DetailSubBar } from "@/components/DetailSubBar";
import { RecordVisit } from "@/components/RecordVisit";

export function ResultView({ analysis }: { analysis: ProductAnalysis }) {
  const { product, score, verdict, price, alternative, factors, weightRedistributed } = analysis;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-16">
      <RecordVisit productId={product.id} />
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
      <VerdictHero score={score} verdict={verdict} />

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
