"use client";

import { useState } from "react";
import type { ScoreFactor } from "@/lib/types";
import { ChevronDownIcon, SparkleIcon } from "@/components/icons";
import { factorTone } from "@/lib/verdict";
import { BREAKDOWN_ID } from "@/components/VerdictHero";

const TONE_VAR: Record<ReturnType<typeof factorTone>, string> = {
  buy: "var(--buy)",
  wait: "var(--wait)",
  dont: "var(--dont)",
  muted: "var(--border)",
};

function FactorRow({ factor, weightPct }: { factor: ScoreFactor; weightPct: number }) {
  const [open, setOpen] = useState(false);
  const tone = factorTone(factor.score);

  return (
    <div className="border-t border-border py-2.5 first:border-t-0 first:pt-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex-1 text-sm font-semibold">{factor.label}</span>
          {factor.score != null ? (
            <span className="text-[15px] font-extrabold" style={{ color: TONE_VAR[tone] }}>
              {factor.score}
            </span>
          ) : (
            <span className="text-xs font-semibold text-muted">Not available</span>
          )}
          <ChevronDownIcon className={`h-[15px] w-[15px] shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full" style={{ width: `${factor.score ?? 0}%`, backgroundColor: TONE_VAR[tone] }} />
        </div>
      </button>
      <div className={`dcontent ${open ? "open" : ""}`}>
        <div>
          <p className="pb-1 pt-2.5 text-[13px] leading-relaxed text-muted">
            {factor.detail} <span className="opacity-70">Weighted {weightPct}% of the score.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ScoreBreakdown({ factors, weightRedistributed }: { factors: ScoreFactor[]; weightRedistributed: boolean }) {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  return (
    <div
      id={BREAKDOWN_ID}
      className="scroll-mt-20 rounded-[22px] border border-border bg-surface p-5 sm:p-6"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <div className="flex items-center gap-2 text-[14.5px] font-bold">
        <SparkleIcon className="h-[15px] w-[15px] text-muted" />
        Score breakdown
      </div>

      {weightRedistributed && (
        <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2.5 text-[12.5px] text-muted">
          One or more factors don&apos;t have reliable data yet. Their weight was redistributed across the
          available factors instead of guessed.
        </p>
      )}

      <div className={weightRedistributed ? "mt-0" : "mt-3"}>
        {factors.map((f) => (
          <FactorRow key={f.key} factor={f} weightPct={Math.round((f.weight / totalWeight) * 100)} />
        ))}
      </div>
    </div>
  );
}
