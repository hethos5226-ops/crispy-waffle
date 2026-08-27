import { analyzeCatalog } from "@/lib/catalog";
import { GradeGroup } from "@/components/GradeGroup";
import type { Verdict } from "@/lib/types";

const ORDER: Verdict[] = ["BUY_NOW", "WAIT", "DONT_BUY"];

export default function OverviewPage() {
  const entries = analyzeCatalog();
  const counts: Record<Verdict, number> = { BUY_NOW: 0, WAIT: 0, DONT_BUY: 0 };
  entries.forEach((e) => counts[e.verdict]++);
  const avgScore = Math.round(entries.reduce((sum, e) => sum + e.score, 0) / entries.length);

  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <h1 className="text-[26px] font-extrabold tracking-tight">Overview</h1>

      <div className="mb-5 mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-border bg-surface px-3.5 py-4 text-center" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="text-2xl font-extrabold tabular-nums">{entries.length}</div>
          <div className="mt-0.5 text-[11.5px] text-muted">Products tracked</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-3.5 py-4 text-center" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="text-2xl font-extrabold tabular-nums">{avgScore}</div>
          <div className="mt-0.5 text-[11.5px] text-muted">Avg. BuyWise Score</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-3.5 py-4 text-center" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="text-2xl font-extrabold tabular-nums">{counts.BUY_NOW}</div>
          <div className="mt-0.5 text-[11.5px] text-muted">Buy-now picks</div>
        </div>
      </div>

      <div className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Grading overview</div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface" style={{ boxShadow: "var(--card-shadow)" }}>
        {ORDER.map((v, i) => (
          <GradeGroup key={v} verdict={v} entries={entries.filter((e) => e.verdict === v)} isLast={i === ORDER.length - 1} />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted">Demo data across the MVP catalog — not your personal scan history.</p>
    </main>
  );
}
