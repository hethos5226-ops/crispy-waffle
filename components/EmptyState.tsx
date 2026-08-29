import Link from "next/link";
import { Wiz } from "@/components/Wiz";

export function EmptyState({ heading, message }: { heading: string; message: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <Wiz pose="magnify" size={96} />
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">{heading}</h1>
        <p className="max-w-sm text-sm text-muted">{message}</p>
      </div>

      <Link
        href="/"
        className="pressable mt-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
      >
        Browse eBay listings
      </Link>
    </main>
  );
}
