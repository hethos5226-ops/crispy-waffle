import type { Verdict } from "@/lib/types";
import { VERDICT_META } from "@/lib/verdict";

export function VerdictBadge({ verdict, size = "lg" }: { verdict: Verdict; size?: "sm" | "lg" }) {
  const meta = VERDICT_META[verdict];
  const isLarge = size === "lg";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold tracking-wide ${
        isLarge ? "px-5 py-2 text-lg" : "px-3 py-1 text-xs"
      }`}
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
