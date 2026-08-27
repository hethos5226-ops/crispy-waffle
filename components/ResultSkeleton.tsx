function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-muted ${className}`} />;
}

export function ResultSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-16" aria-busy="true" aria-label="Analyzing product">
      <div className="flex items-center gap-4">
        <Block className="h-16 w-16 shrink-0 rounded-2xl sm:h-20 sm:w-20" />
        <div className="flex-1 space-y-2">
          <Block className="h-3.5 w-20" />
          <Block className="h-6 w-3/4" />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border">
        <div className="flex flex-col items-center gap-5 bg-surface-muted p-6 sm:flex-row sm:p-8">
          <Block className="h-28 w-28 shrink-0 rounded-full sm:h-32 sm:w-32" />
          <div className="w-full flex-1 space-y-3">
            <Block className="mx-auto h-3 w-28 sm:mx-0" />
            <Block className="mx-auto h-8 w-40 rounded-full sm:mx-0" />
          </div>
        </div>
        <div className="space-y-2.5 bg-surface p-6 sm:p-8">
          <Block className="h-3.5 w-full" />
          <Block className="h-3.5 w-full" />
          <Block className="h-3.5 w-2/3" />
        </div>
      </div>

      <Block className="h-24 w-full rounded-2xl" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Block className="h-40 w-full rounded-2xl" />
        <Block className="h-40 w-full rounded-2xl" />
      </div>

      <Block className="h-20 w-full rounded-2xl" />
    </div>
  );
}
