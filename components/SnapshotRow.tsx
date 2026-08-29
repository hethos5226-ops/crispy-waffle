"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { ListingSnapshot } from "@/lib/data/snapshot";
import { RETAILER_LABELS } from "@/lib/data/listing";
import { ChevronRightIcon, BoxIcon } from "@/components/icons";
import { VERDICT_META } from "@/lib/verdict";
import { formatPriceWithCurrency } from "@/lib/money";

function relativeTime(ms: number): string {
  const days = ms / 86400000;
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 30) return `${Math.floor(days)}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * A remembered listing in History or Favorites.
 *
 * Everything shown was captured from eBay when the listing was viewed, so the
 * date is surfaced too — the live price may well have moved since.
 */
export function SnapshotRow({ snapshot, now }: { snapshot: ListingSnapshot; now: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const verdict = snapshot.verdict;

  return (
    <Link
      href={`/listing/?id=${encodeURIComponent(snapshot.id)}`}
      className="pressable flex items-center gap-3.5 rounded-[20px] border border-border bg-surface p-3"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[13px] bg-surface-muted">
        {snapshot.imageUrl && !imageFailed ? (
          <Image
            src={snapshot.imageUrl}
            alt={snapshot.title}
            fill
            sizes="52px"
            className="object-contain"
            onError={() => setImageFailed(true)}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <BoxIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold">{snapshot.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
          {verdict && (
            <>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: VERDICT_META[verdict].color }} />
              <span>{VERDICT_META[verdict].short}</span>
              <span className="text-border">·</span>
            </>
          )}
          <span className="font-semibold text-foreground">
            {formatPriceWithCurrency(snapshot.price, snapshot.currency)}
          </span>
          <span className="text-border">·</span>
          <span>
            {RETAILER_LABELS[snapshot.retailer]}, {relativeTime(now - snapshot.capturedAt)}
          </span>
        </p>
      </div>

      <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
