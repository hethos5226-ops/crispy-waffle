"use client";

import { Wiz } from "@/components/Wiz";
import { ProductRow } from "@/components/ProductRow";
import { useFavorites } from "@/lib/storage";
import type { CatalogEntry } from "@/lib/catalog";
import { VERDICT_META } from "@/lib/verdict";

export function FavoritesList({ entries }: { entries: CatalogEntry[] }) {
  const favIds = useFavorites();
  const favorites = favIds.map((id) => entries.find((e) => e.product.id === id)).filter((e): e is CatalogEntry => Boolean(e));

  return (
    <div>
      <div className="mb-3 mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">Your favorites</div>
      {favorites.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {favorites.map((e) => (
            <ProductRow key={e.product.id} product={e.product} verdict={e.verdict} sub={`${VERDICT_META[e.verdict].short} · $${e.product.price.current}`} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border px-4 py-6 text-center">
          <Wiz pose="shoppingBag" size={84} />
          <p className="text-[13.5px] text-muted">Star a product from its page to keep track of it here.</p>
        </div>
      )}
    </div>
  );
}
