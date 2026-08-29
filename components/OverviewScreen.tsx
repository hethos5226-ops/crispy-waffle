"use client";

import { useState } from "react";
import Link from "next/link";
import { SnapshotRow } from "@/components/SnapshotRow";
import { Wiz } from "@/components/Wiz";
import { useHistory } from "@/lib/storage";
import { VERDICT_META } from "@/lib/verdict";
import { ChevronDownIcon } from "@/components/icons";
import type { Verdict } from "@/lib/types";
import type { ListingSnapshot } from "@/lib/data/snapshot";

const ORDER: Verdict[] = ["BUY_NOW", "WAIT", "DONT_BUY"];

/** Summarises the eBay listings this device has actually looked at. */
export function OverviewScreen() {
  const history = useHistory();
  const [now] = useState(() => Date.now());

  // Only listings that produced a score can be graded.
  const scored = history.filter((s): s is ListingSnapshot & { score: number; verdict: Verdict } =>
    s.score != null && s.verdict != null
  );

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <Wiz pose="tablet" size={112} />
        <div>
          <p className="text-[17px] font-bold">Nothing to summarize yet</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13.5px] text-muted">
            Open a few eBay listings and I&apos;ll break down how they scored across everything you&apos;ve checked.
          </p>
        </div>
        <Link href="/" className="pressable mt-1 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">
          Browse products
        </Link>
      </div>
    );
  }

  const counts: Record<Verdict, number> = { BUY_NOW: 0, WAIT: 0, DONT_BUY: 0 };
  scored.forEach((s) => counts[s.verdict]++);
  const avgScore = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length) : null;

  return (
    <>
      <div className="mb-5 mt-4 grid grid-cols-3 gap-2.5">
        <StatTile value={String(history.length)} label={history.length === 1 ? "Listing viewed" : "Listings viewed"} />
        <StatTile value={avgScore != null ? String(avgScore) : "—"} label="Avg. BuyWise Score" />
        <StatTile value={String(counts.BUY_NOW)} label="Buy-now picks" />
      </div>

      <div className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Your grading overview</div>
      <div className="overflow-hidden rounded-[22px] border border-border bg-surface" style={{ boxShadow: "var(--card-shadow)" }}>
        {ORDER.map((v, i) => (
          <Group
            key={v}
            verdict={v}
            items={scored.filter((s) => s.verdict === v)}
            now={now}
            isLast={i === ORDER.length - 1}
          />
        ))}
      </div>

      {scored.length < history.length && (
        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-muted">
          {history.length - scored.length} of {history.length} viewed listing
          {history.length - scored.length === 1 ? " isn't" : "s aren't"} graded — eBay didn&apos;t provide enough data to
          score {history.length - scored.length === 1 ? "it" : "them"}.
        </p>
      )}
    </>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-surface px-3.5 py-4 text-center" style={{ boxShadow: "var(--card-shadow)" }}>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11.5px] leading-tight text-muted">{label}</div>
    </div>
  );
}

function Group({
  verdict,
  items,
  now,
  isLast,
}: {
  verdict: Verdict;
  items: ListingSnapshot[];
  now: number;
  isLast: boolean;
}) {
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
        <span className="font-semibold tabular-nums text-muted">{items.length}</span>
        <ChevronDownIcon className={`h-[15px] w-[15px] shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`dcontent ${open ? "open" : ""}`}>
        <div>
          <div className="flex flex-col gap-2 bg-surface-muted p-3.5 pt-1">
            {items.length > 0 ? (
              items.map((s) => <SnapshotRow key={s.id} snapshot={s} now={now} />)
            ) : (
              <p className="px-1 py-1.5 text-[13px] text-muted">Nothing here yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
