"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ShareIcon } from "@/components/icons";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useToast } from "@/components/ToastProvider";
import type { ListingSnapshot } from "@/lib/data/snapshot";

export function DetailSubBar({ snapshot }: { snapshot: ListingSnapshot }) {
  const router = useRouter();
  const showToast = useToast();

  return (
    <div className="flex items-center justify-between pb-4 pt-1">
      <button
        type="button"
        aria-label="Back"
        onClick={() => router.back()}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground pressable pressable-tight"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <ChevronLeftIcon className="h-[18px] w-[18px]" />
      </button>
      <div className="flex items-center gap-2">
        <FavoriteButton snapshot={snapshot} />
        <button
          type="button"
          aria-label="Share"
          onClick={() => showToast("Sharing isn't available yet")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground pressable pressable-tight"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          <ShareIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
