import Link from "next/link";
import type { Product, Verdict } from "@/lib/types";
import { ProductGlyph } from "@/components/ProductGlyph";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ArrowRightIcon } from "@/components/icons";

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
      className="group flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/15"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <ProductGlyph category={product.category} className="h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="text-sm text-muted">
          ${product.price.current} · BuyWise Score {score}/100
        </p>
      </div>
      <VerdictBadge verdict={verdict} size="sm" />
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
