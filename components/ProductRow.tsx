import Link from "next/link";
import type { Product, Verdict } from "@/lib/types";
import { ProductGlyph } from "@/components/ProductGlyph";
import { ChevronRightIcon } from "@/components/icons";
import { VERDICT_META } from "@/lib/verdict";

export function ProductRow({ product, verdict, sub }: { product: Product; verdict: Verdict; sub: string }) {
  const dotColor = VERDICT_META[verdict].color;

  return (
    <Link
      href={`/product/${product.id}`}
      className="flex items-center gap-3.5 rounded-[20px] border border-border bg-surface p-3 pressable"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <ProductGlyph category={product.category} className="h-[52px] w-[52px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold">{product.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
          {sub}
        </p>
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
