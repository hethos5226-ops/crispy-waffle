import { Suspense } from "react";
import { ListingClient } from "@/components/ListingClient";
import { ResultSkeleton } from "@/components/ResultSkeleton";

export default function ListingPage() {
  return (
    <Suspense
      fallback={
        <main className="px-6 py-8">
          <ResultSkeleton />
        </main>
      }
    >
      <ListingClient />
    </Suspense>
  );
}
