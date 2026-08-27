"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { ProductRow } from "@/components/ProductRow";
import type { CatalogEntry } from "@/lib/catalog";
import { VERDICT_META } from "@/lib/verdict";
import type { Verdict } from "@/lib/types";

export function GradeGroup({ verdict, entries, isLast }: { verdict: Verdict; entries: CatalogEntry[]; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = VERDICT_META[verdict];

  return (
    <div className={isLast ? "" : "border-b border-border"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-[18px] py-[15px] text-left"
      >
        <span className="h-[11px] w-[11px] shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="flex-1 text-[15px] font-semibold">{meta.label}</span>
        <span className="tabular-nums font-semibold text-muted">{entries.length}</span>
        <ChevronDownIcon className={`h-[15px] w-[15px] shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`dcontent ${open ? "open" : ""}`}>
        <div>
          <div className="flex flex-col gap-2 bg-surface-muted p-3.5 pt-1">
            {entries.length > 0 ? (
              entries.map((e) => <ProductRow key={e.product.id} product={e.product} verdict={e.verdict} sub={`Score ${e.score}/100`} />)
            ) : (
              <p className="px-1 py-1.5 text-[13px] text-muted">Nothing here yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
