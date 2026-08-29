import { LiveRecs } from "@/components/LiveRecs";
import { Wiz } from "@/components/Wiz";

export default function RecsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight">Recs</h1>
          <p className="mt-1 text-sm text-muted">Live eBay listings, scored so you know what&apos;s worth buying.</p>
        </div>
        <Wiz pose="magnify" size={72} className="-mb-1 shrink-0" />
      </div>
      <LiveRecs />
    </main>
  );
}
