import type { Verdict } from "@/lib/types";

export const VERDICT_META: Record<
  Verdict,
  { label: string; emoji: string; color: string; soft: string }
> = {
  BUY_NOW: { label: "BUY NOW", emoji: "🟢", color: "var(--buy)", soft: "var(--buy-soft)" },
  WAIT: { label: "WAIT", emoji: "🟡", color: "var(--wait)", soft: "var(--wait-soft)" },
  DONT_BUY: { label: "DON'T BUY", emoji: "🔴", color: "var(--dont)", soft: "var(--dont-soft)" },
};
