"use client";

import { useState } from "react";
import { ChevronDownIcon, StoreIcon } from "@/components/icons";

export interface PriceDetailRow {
  label: string;
  value: string;
  /** Optional supporting text, e.g. the date a low was recorded. */
  meta?: string;
  tone?: "buy" | "wait" | "dont";
}

/**
 * A price that can be tapped to reveal where the number came from and how it
 * compares. Used for the headline price and each retailer listing, so every
 * figure in the app is traceable rather than bare.
 */
export function ExpandablePrice({
  value,
  label,
  source,
  rows,
  note,
  size = "lg",
  trailing,
}: {
  value: string;
  label?: string;
  source?: string;
  rows: PriceDetailRow[];
  note?: string;
  size?: "sm" | "lg";
  trailing?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isLarge = size === "lg";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="pressable -mx-1 flex w-full items-start justify-between gap-3 rounded-2xl px-1 py-0.5 text-left"
      >
        <div className="min-w-0">
          {label && <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>}
          <p
            className={`flex items-center gap-1.5 font-extrabold tabular-nums tracking-tight ${
              isLarge ? "mt-1 text-4xl" : "text-[14.5px]"
            }`}
          >
            {value}
            <ChevronDownIcon
              className={`${isLarge ? "h-5 w-5" : "h-3.5 w-3.5"} shrink-0 text-muted transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </p>
          {source && !isLarge && <p className="mt-0.5 text-[11px] text-muted">via {source}</p>}
        </div>
        {trailing}
      </button>

      <div className={`dcontent ${open ? "open" : ""}`}>
        <div>
          <div className="mt-3 rounded-2xl bg-surface-muted p-3.5">
            {source && (
              <p className="mb-2.5 flex items-center gap-1.5 border-b border-border pb-2.5 text-[12.5px] font-semibold">
                <StoreIcon className="h-3.5 w-3.5 text-muted" />
                Price from {source}
              </p>
            )}
            <dl className="flex flex-col gap-2">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-right">
                    <span
                      className="font-semibold tabular-nums"
                      style={row.tone ? { color: `var(--${row.tone})` } : undefined}
                    >
                      {row.value}
                    </span>
                    {row.meta && <span className="ml-1.5 text-[11.5px] text-muted">{row.meta}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {note && <p className="mt-2.5 border-t border-border pt-2.5 text-[11.5px] leading-relaxed text-muted">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
