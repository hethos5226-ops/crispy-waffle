"use client";

import type { Verdict } from "@/lib/types";
import { ScoreDial } from "@/components/ScoreDial";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ArrowRightIcon } from "@/components/icons";
import { Wiz, type WizPose } from "@/components/Wiz";
import { VERDICT_META } from "@/lib/verdict";

/** Anchor the "See why" affordance scrolls to. */
export const BREAKDOWN_ID = "score-breakdown";

/** Wiz reacts to the call, so the verdict reads at a glance even before the words. */
const POSE_FOR_VERDICT: Record<Verdict, WizPose> = {
  BUY_NOW: "thumbsUp",
  WAIT: "tablet",
  DONT_BUY: "pointing",
};

export function VerdictHero({ score, verdict }: { score: number; verdict: Verdict }) {
  const meta = VERDICT_META[verdict];

  function seeWhy() {
    const el = document.getElementById(BREAKDOWN_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Brief highlight so it's obvious which card the arrow pointed at.
    el.classList.add("flash-focus");
    setTimeout(() => el.classList.remove("flash-focus"), 1400);
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-border" style={{ boxShadow: "var(--card-shadow)" }}>
      <div
        className="flex flex-col items-center gap-6 p-7 text-center sm:flex-row sm:items-center sm:gap-8 sm:p-8 sm:text-left"
        style={{ backgroundColor: meta.soft }}
      >
        <ScoreDial score={score} verdict={verdict} size={150} />

        {/* Left-aligned column so the label, verdict and link share one edge. */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
          <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: meta.color }}>
            BuyWise Score
          </p>
          <VerdictBadge verdict={verdict} />
          <button
            type="button"
            onClick={seeWhy}
            className="pressable group -mx-2 mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13.5px] font-semibold"
            style={{ color: meta.color }}
          >
            See why
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Fills the trailing space on wider screens; redundant on mobile, where
            the column layout has no room to spare. */}
        <Wiz pose={POSE_FOR_VERDICT[verdict]} size={124} className="hidden shrink-0 self-end sm:block" />
      </div>
    </div>
  );
}
