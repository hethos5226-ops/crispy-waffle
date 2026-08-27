"use client";

import { useState } from "react";
import Link from "next/link";
import { Wiz } from "@/components/Wiz";
import { ProductRow } from "@/components/ProductRow";
import { TrashIcon } from "@/components/icons";
import { clearHistory, useHistory } from "@/lib/storage";
import type { CatalogEntry } from "@/lib/catalog";
import { VERDICT_META } from "@/lib/verdict";

function relativeTime(ms: number): string {
  const days = ms / 86400000;
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 30) return `${Math.floor(days)}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function HistoryList({ entries }: { entries: CatalogEntry[] }) {
  const items = useHistory();
  // Captured once per mount via a lazy initializer (React's sanctioned escape
  // hatch for an otherwise-impure read) rather than calling Date.now() inline
  // during render.
  const [now] = useState(() => Date.now());

  const rows = items
    .map((e) => ({ e, entry: entries.find((x) => x.product.id === e.id) }))
    .filter((x): x is { e: { id: string; ts: number }; entry: CatalogEntry } => Boolean(x.entry));

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <Wiz expression="thinking" size={56} />
        <div>
          <p className="text-[17px] font-bold">No products analyzed yet</p>
          <p className="mt-1.5 max-w-xs text-[13.5px] text-muted">Everything you look up will show up here so you can find it again.</p>
        </div>
        <Link href="/" className="mt-1 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90">
          Search a product
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3.5 flex justify-end">
        <button
          type="button"
          onClick={() => clearHistory()}
          className="flex items-center gap-1.5 px-1 py-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-dont"
        >
          <TrashIcon className="h-3 w-3" />
          Clear history
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map(({ e, entry }) => (
          <ProductRow
            key={e.id}
            product={entry.product}
            verdict={entry.verdict}
            sub={`${VERDICT_META[entry.verdict].short} · analyzed ${relativeTime(now - e.ts)}`}
          />
        ))}
      </div>
    </div>
  );
}
