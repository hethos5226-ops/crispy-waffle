"use client";

import { useState } from "react";
import Link from "next/link";
import { Wiz } from "@/components/Wiz";
import { SnapshotRow } from "@/components/SnapshotRow";
import { TrashIcon } from "@/components/icons";
import { clearHistory, useHistory } from "@/lib/storage";

export function HistoryList() {
  const items = useHistory();
  const [now] = useState(() => Date.now());

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <Wiz pose="tablet" size={104} />
        <div>
          <p className="text-[17px] font-bold">No listings viewed yet</p>
          <p className="mt-1.5 max-w-xs text-[13.5px] text-muted">
            Every eBay listing you open shows up here so you can find it again.
          </p>
        </div>
        <Link
          href="/"
          className="pressable mt-1 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
        >
          Browse products
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
        {items.map((s) => (
          <SnapshotRow key={s.id} snapshot={s} now={now} />
        ))}
      </div>
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-muted">
        Prices shown are what eBay listed when you viewed each item — open one to see its current price.
      </p>
    </div>
  );
}
