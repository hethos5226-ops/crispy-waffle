import type { Verdict } from "@/lib/types";
import { VERDICT_META } from "@/lib/verdict";

export function ScoreDial({ score, verdict }: { score: number; verdict: Verdict }) {
  const color = VERDICT_META[verdict].color;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold sm:text-4xl">{score}</span>
        <span className="text-xs text-muted">/ 100</span>
      </div>
    </div>
  );
}
