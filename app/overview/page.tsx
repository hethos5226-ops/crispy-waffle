import { analyzeCatalog } from "@/lib/catalog";
import { OverviewScreen } from "@/components/OverviewScreen";

export default function OverviewPage() {
  // The full catalog is passed down so the client can resolve whichever
  // products happen to be in this device's history.
  const entries = analyzeCatalog();

  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <h1 className="text-[26px] font-extrabold tracking-tight">Overview</h1>
      <OverviewScreen entries={entries} />
    </main>
  );
}
