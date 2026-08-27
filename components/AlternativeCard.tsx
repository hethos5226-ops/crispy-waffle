import Link from "next/link";
import type { Product, Verdict } from "@/lib/types";
import { ProductGlyph } from "@/components/ProductGlyph";
import { VerdictBadge } from "@/components/VerdictBadge";

export function AlternativeCard({
  product,
  score,
  verdict,
}: {
  product: Product;
  score: number;
  verdict: Verdict;
}) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-muted"
    >
      <ProductGlyph category={product.category} className="h-14 w-14" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="text-sm text-muted">
          ${product.price.current} · BuyWise Score {score}/100
        </p>
      </div>
      <VerdictBadge verdict={verdict} size="sm" />
    </Link>
  );
}
