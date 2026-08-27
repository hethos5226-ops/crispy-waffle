import type { Verdict } from "@/lib/types";
import { VERDICT_META } from "@/lib/verdict";

/**
 * A drawn dot rather than an emoji — platform emoji render differently on
 * every OS and never match the app's own palette.
 */
export function VerdictDot({ verdict, size = 10 }: { verdict: Verdict; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: VERDICT_META[verdict].color,
        boxShadow: `0 0 0 ${Math.max(2, size * 0.28)}px color-mix(in srgb, ${VERDICT_META[verdict].color} 18%, transparent)`,
      }}
    />
  );
}

export function VerdictBadge({ verdict, size = "lg" }: { verdict: Verdict; size?: "sm" | "lg" }) {
  const meta = VERDICT_META[verdict];
  const isLarge = size === "lg";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tracking-wide ${
        isLarge ? "gap-2.5 px-4 py-2 text-lg sm:text-xl" : "gap-2 px-3 py-1 text-[11px]"
      }`}
      style={{ backgroundColor: meta.soft, color: meta.color }}
    >
      <VerdictDot verdict={verdict} size={isLarge ? 12 : 7} />
      {meta.label}
    </span>
  );
}
