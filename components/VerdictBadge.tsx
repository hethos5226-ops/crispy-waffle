import type { Verdict } from "@/lib/types";
import { VERDICT_META } from "@/lib/verdict";

export function VerdictBadge({ verdict, size = "lg" }: { verdict: Verdict; size?: "sm" | "lg" }) {
  const meta = VERDICT_META[verdict];
  const isLarge = size === "lg";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-bold tracking-wide ${
        isLarge ? "px-4 py-1.5 text-base sm:text-lg" : "px-3 py-1 text-[11px]"
      }`}
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      <span aria-hidden className={isLarge ? "text-xl" : "text-xs"}>
        {meta.emoji}
      </span>
      {meta.label}
    </span>
  );
}
