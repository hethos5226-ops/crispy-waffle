"use client";

import { useState } from "react";
import { Wiz } from "@/components/Wiz";
import { SnapshotRow } from "@/components/SnapshotRow";
import { useFavorites } from "@/lib/storage";

export function FavoritesList() {
  const favorites = useFavorites();
  // Captured once per mount rather than read during render.
  const [now] = useState(() => Date.now());

  return (
    <div>
      <div className="mb-3 mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">Your favorites</div>
      {favorites.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {favorites.map((s) => (
            <SnapshotRow key={s.id} snapshot={s} now={now} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border px-4 py-6 text-center">
          <Wiz pose="shoppingBag" size={84} />
          <p className="text-[13.5px] text-muted">Star a listing from its page to keep track of it here.</p>
        </div>
      )}
    </div>
  );
}
