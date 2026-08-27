import type { Verdict } from "@/lib/types";
import { VERDICT_META } from "@/lib/verdict";

export function ScoreDial({ score, verdict, size = 150 }: { score: number; verdict: Verdict; size?: number }) {
  const color = VERDICT_META[verdict].color;
  const stroke = Math.round(size * 0.075);
  const radius = 50 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-extrabold leading-none tabular-nums" style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
        <span className="font-medium text-muted" style={{ fontSize: size * 0.085, marginTop: size * 0.045 }}>
          / 100
        </span>
      </div>
    </div>
  );
}
