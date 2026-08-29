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
          reliability (15%), alternatives (10%), warranty (10%), and product age (10%). Price is measured against
          the median of comparable eBay listings in the same condition right now. eBay publishes no price history,
          review text, warranty terms or release dates, so those factors are marked <em>Not available</em> and
          excluded — their weight is redistributed across what is actually known, never guessed.
        </p>
      </Disclosure>
    </div>
  );
}
