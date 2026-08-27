import { SparkleIcon } from "@/components/icons";
import { Disclosure } from "@/components/Disclosure";

export function AiSummaryCard({ reasoning }: { reasoning: string }) {
  return (
    <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-6" style={{ boxShadow: "var(--card-shadow)" }}>
      <h2 className="flex items-center gap-1.5 text-[14.5px] font-bold">
        <SparkleIcon className="h-[15px] w-[15px] text-muted" />
        AI Summary
      </h2>
      <p className="mt-2.5 text-[15px] leading-relaxed">{reasoning}</p>
      <Disclosure trigger={<span>How BuyWise calculated this</span>}>
        <p className="pb-1 pt-2.5 text-[13.5px] leading-relaxed text-muted">
          BuyWise Score is a weighted blend of six factors: price &amp; value (30%), reviews &amp; quality (25%),
          reliability (15%), alternatives (10%), warranty (10%), and product age (10%). Reliability is scored from
          complaint frequency alone — not from review sentiment — so the two never double-count the same signal.
          When a factor like warranty or release date isn&apos;t reliably known, it&apos;s excluded and its weight
          is redistributed rather than guessed. This is demo data; once connected to real data sources, this panel
          will explain the actual figures behind each score.
        </p>
      </Disclosure>
    </div>
  );
}
