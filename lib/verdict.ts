import type { Verdict } from "@/lib/types";

export const VERDICT_META: Record<
  Verdict,
  { label: string; short: string; emoji: string; color: string; soft: string }
> = {
  BUY_NOW: { label: "BUY NOW", short: "Buy now", emoji: "🟢", color: "var(--buy)", soft: "var(--buy-soft)" },
  WAIT: { label: "WAIT", short: "Wait", emoji: "🟡", color: "var(--wait)", soft: "var(--wait-soft)" },
  DONT_BUY: { label: "DON'T BUY", short: "Don't buy", emoji: "🔴", color: "var(--dont)", soft: "var(--dont-soft)" },
};

export function factorTone(score: number | null): "buy" | "wait" | "dont" | "muted" {
  if (score == null) return "muted";
  if (score >= 75) return "buy";
  if (score >= 50) return "wait";
  return "dont";
}
