"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = ["Hisense 50P7", "Sony WH-1000XM5", "MacBook Air M2", "Samsung QN90D"];

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
        className="flex items-center gap-2 rounded-full border border-border bg-surface p-2 shadow-sm"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a product URL or search a product name…"
          className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-muted sm:text-base"
        />
        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Analyze
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => go(example)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
