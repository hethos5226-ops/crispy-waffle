"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import type { CatalogEntry } from "@/lib/catalog";
import { ProductRow } from "@/components/ProductRow";
import { SearchIcon } from "@/components/icons";
import { VERDICT_META } from "@/lib/verdict";
import { useTodayLabel } from "@/lib/useToday";

const CATEGORIES: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tv", label: "TVs" },
  { id: "headphones", label: "Headphones" },
  { id: "phone", label: "Phones" },
  { id: "laptop", label: "Laptops" },
  { id: "monitor", label: "Monitors" },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function RecsBrowser({ entries }: { entries: CatalogEntry[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const updatedLabel = useTodayLabel();

  const filtered = useMemo(() => {
    let list = entries;
    if (category !== "all") list = list.filter((e) => e.product.category === category);
    const q = normalize(query);
    if (q) {
      const tokens = q.split(" ").filter((t) => t.length >= 2);
      list = list.filter((e) => {
        const haystack = normalize([e.product.name, e.product.brand, ...e.product.aliases].join(" "));
        return tokens.every((t) => haystack.includes(t));
      });
    }
    return [...list].sort((a, b) => b.score - a.score);
  }, [entries, category, query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/result?q=${encodeURIComponent(q)}`);
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-4 pr-1.5 transition-shadow focus-within:ring-2 focus-within:ring-foreground/10"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products or paste a URL…"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
        />
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold pressable ${
              category === c.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-3 mt-7 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold uppercase tracking-wide text-muted">Top picks right now</span>
        <span className="text-[12.5px] font-semibold text-muted">Updated {updatedLabel}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {filtered.length > 0 ? (
          filtered.map((e) => (
            <ProductRow
              key={e.product.id}
              product={e.product}
              verdict={e.verdict}
              sub={`${VERDICT_META[e.verdict].short} · Score ${e.score}/100`}
            />
          ))
        ) : (
          <p className="px-1 py-2.5 text-[13.5px] text-muted">No products match — try a different search or category.</p>
        )}
      </div>
    </div>
  );
}
