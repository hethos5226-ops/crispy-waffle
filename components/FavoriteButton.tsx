"use client";

import { StarIcon, StarOutlineIcon } from "@/components/icons";
import { toggleFavorite, useIsFavorite } from "@/lib/storage";
import { useToast } from "@/components/ToastProvider";

export function FavoriteButton({ productId }: { productId: string }) {
  const fav = useIsFavorite(productId);
  const showToast = useToast();

  return (
    <button
      type="button"
      aria-label="Favorite"
      aria-pressed={fav}
      onClick={() => {
        const nowFav = toggleFavorite(productId);
        showToast(nowFav ? "Added to favorites" : "Removed from favorites");
      }}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface pressable pressable-tight ${
        fav ? "text-wait" : "text-foreground"
      }`}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {fav ? <StarIcon className="h-4 w-4" /> : <StarOutlineIcon className="h-4 w-4" />}
    </button>
  );
}
