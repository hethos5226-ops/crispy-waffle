import { SubPageHeader } from "@/components/SubPageHeader";
import { Wiz } from "@/components/Wiz";
import { SCORE_WEIGHTS } from "@/lib/scoreWeights";

const FACTORS: { key: keyof typeof SCORE_WEIGHTS; label: string; blurb: string }[] = [
  {
    key: "price",
    label: "Price & Value",
    blurb:
      "How this listing's price compares with the median of comparable listings in the same condition on eBay right now. Below the median scores highest; above it drags the score down.",
  },
  {
    key: "reviews",
    label: "Reviews & Quality",
    blurb:
      "eBay's own product rating for the listing, when it's matched to a catalog product. Many listings have no rating, in which case this factor is excluded rather than guessed.",
  },
  {
    key: "reliability",
    label: "Reliability",
    blurb:
      "How consistent owner experience is, read from the star breakdown: a product averaging 4 because everyone rates it 4 is not the same as one averaging 4 from a mix of 5s and 1s.",
  },
  {
    key: "alternatives",
    label: "Alternatives",
    blurb:
      "Whether something comparable does the job better or cheaper. If a close rival clearly beats it, this pulls the score down.",
  },
  {
    key: "warranty",
    label: "Warranty",
    blurb:
      "Length and type of cover, and whether there are notable exclusions. A longer manufacturer warranty scores better than a short or heavily limited one.",
  },
  {
    key: "age",
    label: "Product Age",
    blurb:
      "How current the model is. Age only counts against a product once it's genuinely dated or a newer generation offers a real improvement — an older model that still holds up isn't punished.",
  },
];

export default function ScoringPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <SubPageHeader title="How scoring works" />

      <div
        className="mb-6 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-5"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <Wiz pose="pointing" size={82} />
        <p className="text-[14px] leading-relaxed text-muted">
          Every BuyWise Score is a weighted blend of six factors. Nothing is hidden — you can open any factor on a
          product page to see exactly what it scored and why.
        </p>
      </div>

      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">The six factors</h2>
      <div className="flex flex-col gap-2.5">
        {FACTORS.map((factor) => (
          <div
            key={factor.key}
            className="rounded-[18px] border border-border bg-surface p-4"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-bold">{factor.label}</h3>
              <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[12px] font-bold tabular-nums text-muted">
                {Math.round(SCORE_WEIGHTS[factor.key] * 100)}%
              </span>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{factor.blurb}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">Principles</h2>
      <div
        className="flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-5 text-[13.5px] leading-relaxed text-muted"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <p>
          <span className="font-semibold text-foreground">Price matters most.</span> Value carries the largest single
          weight, because the whole question is whether something is worth buying at the price in front of you.
        </p>
        <p>
          <span className="font-semibold text-foreground">Nothing gets counted twice.</span> Each factor measures a
          different signal. Reliability looks only at how often problems recur, so a product isn&apos;t penalised twice
          for the same complaint already reflected in its rating.
        </p>
        <p>
          <span className="font-semibold text-foreground">Missing data is never invented.</span> If a warranty term or
          release date can&apos;t be established reliably, that factor is marked <em>Not available</em> and excluded.
          Its weight is redistributed across the factors that are known, rather than filled in with a guess.
        </p>
        <p>
          <span className="font-semibold text-foreground">Weights will change.</span> These are starting values. As more
          retailers and richer data are connected, the weights will be tuned against how well the score predicts
          genuinely good purchases.
        </p>
      </div>

      <h2 className="mb-3 mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">What the verdict means</h2>
      <div
        className="overflow-hidden rounded-[22px] border border-border bg-surface"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        {[
          { range: "75 – 100", label: "Buy now", tone: "buy", text: "Good product, good price. No strong reason to wait." },
          { range: "50 – 74", label: "Wait", tone: "wait", text: "Decent, but something's off — usually price, or a better option nearby." },
          { range: "0 – 49", label: "Don't buy", tone: "dont", text: "Poor value at this price, or problems serious enough to avoid it." },
        ].map((row, i) => (
          <div key={row.label} className={`flex items-start gap-3 p-4 ${i > 0 ? "border-t border-border" : ""}`}>
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: `var(--${row.tone})` }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[14.5px] font-bold" style={{ color: `var(--${row.tone})` }}>
                  {row.label}
                </span>
                <span className="text-[12px] tabular-nums text-muted">{row.range}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{row.text}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Scores are calculated from live eBay listing data. eBay doesn&apos;t publish price history, review text,
        warranty terms or release dates, so those factors show as <em>Not available</em> and are excluded from the
        score rather than estimated.
      </p>
    </main>
  );
}
