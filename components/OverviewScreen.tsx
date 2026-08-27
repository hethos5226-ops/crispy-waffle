"use client";

import Link from "next/link";
import { GradeGroup } from "@/components/GradeGroup";
import { Wiz } from "@/components/Wiz";
import { useHistory } from "@/lib/storage";
import type { CatalogEntry } from "@/lib/catalog";
import type { Verdict } from "@/lib/types";

const ORDER: Verdict[] = ["BUY_NOW", "WAIT", "DONT_BUY"];

/**
 * Summarizes the products *this viewer* has actually looked at, drawn from
 * their local history — not the whole catalog.
 */
export function OverviewScreen({ entries }: { entries: CatalogEntry[] }) {
  const history = useHistory();

  const scanned = history
    .map((h) => entries.find((e) => e.product.id === h.id))
    .filter((e): e is CatalogEntry => Boolean(e));

  if (scanned.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <Wiz pose="tablet" size={112} />
        <div>
          <p className="text-[17px] font-bold">Nothing to summarize yet</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13.5px] text-muted">
            Scan or look up a few products and I&apos;ll break down how they scored across everything you&apos;ve checked.
          </p>
        </div>
        <Link
          href="/scan"
          className="pressable mt-1 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
        >
          Scan a product
        </Link>
      </div>
    );
  }

  const counts: Record<Verdict, number> = { BUY_NOW: 0, WAIT: 0, DONT_BUY: 0 };
  scanned.forEach((e) => counts[e.verdict]++);
  const avgScore = Math.round(scanned.reduce((sum, e) => sum + e.score, 0) / scanned.length);

  return (
    <>
      <div className="mb-5 mt-4 grid grid-cols-3 gap-2.5">
        <StatTile value={scanned.length} label={scanned.length === 1 ? "Product checked" : "Products checked"} />
        <StatTile value={avgScore} label="Avg. BuyWise Score" />
        <StatTile value={counts.BUY_NOW} label="Buy-now picks" />
      </div>

      <div className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Your grading overview</div>
      <div
        className="overflow-hidden rounded-[22px] border border-border bg-surface"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        {ORDER.map((v, i) => (
          <GradeGroup
            key={v}
            verdict={v}
            entries={scanned.filter((e) => e.verdict === v)}
            isLast={i === ORDER.length - 1}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Based on the {scanned.length} product{scanned.length === 1 ? "" : "s"} you&apos;ve checked on this device.
      </p>
    </>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="rounded-[18px] border border-border bg-surface px-3.5 py-4 text-center"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] leading-tight text-muted">{label}</div>
    </div>
  );
}
