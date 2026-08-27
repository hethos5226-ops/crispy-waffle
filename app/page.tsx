import { analyzeCatalog } from "@/lib/catalog";
import { RecsBrowser } from "@/components/RecsBrowser";
import { FavoritesList } from "@/components/FavoritesList";

export default function RecsPage() {
  const entries = analyzeCatalog();

  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <h1 className="text-[26px] font-extrabold tracking-tight">Recs</h1>
      <p className="mb-4 mt-1 text-sm text-muted">Search, browse by category, and keep track of what you like.</p>

      <RecsBrowser entries={entries} />
      <FavoritesList entries={entries} />
    </main>
  );
}
