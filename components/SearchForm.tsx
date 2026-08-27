"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { EXAMPLE_QUERIES } from "@/lib/examples";

export function SearchForm() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(query: string) {
    const q = query.trim();
    if (!q) return;
    router.push(`/result?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface p-1.5 pl-4 transition-shadow focus-within:ring-2 focus-within:ring-foreground/10"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a product URL or search a product name…"
          className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted sm:text-base"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-95 hover:opacity-90"
        >
          Analyze
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            onClick={() => go(example)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
