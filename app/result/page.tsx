import { Suspense } from "react";
import { ResultClient } from "@/components/ResultClient";
import { ResultSkeleton } from "@/components/ResultSkeleton";

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="px-6 py-8">
          <ResultSkeleton />
        </main>
      }
    >
      <ResultClient />
    </Suspense>
  );
}
