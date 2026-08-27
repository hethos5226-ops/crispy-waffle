import { SearchForm } from "@/components/SearchForm";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">BuyWise</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Should you buy it?
        </h1>
        <p className="mx-auto max-w-md text-base text-muted sm:text-lg">
          Paste a product link or search a product. Get one clear answer —
          instead of hours of comparing prices, reviews and forums yourself.
        </p>
      </div>

      <SearchForm />

      <p className="text-xs text-muted">
        MVP covers TVs, headphones, phones, laptops and monitors.
      </p>
    </main>
  );
}
