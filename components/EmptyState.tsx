import Link from "next/link";
import { Wiz } from "@/components/Wiz";
import { EXAMPLE_QUERIES } from "@/lib/examples";

export function EmptyState({ heading, message }: { heading: string; message: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <Wiz expression="thinking" size={56} />
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">{heading}</h1>
        <p className="max-w-sm text-sm text-muted">{message}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <Link
            key={example}
            href={`/result?q=${encodeURIComponent(example)}`}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            {example}
          </Link>
        ))}
      </div>

      <Link
        href="/"
        className="mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Back to search
      </Link>
    </main>
  );
}
