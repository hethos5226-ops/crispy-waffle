"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";

export function SubPageHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="mb-5 flex items-center gap-3">
      <button
        type="button"
        aria-label="Back"
        onClick={() => router.back()}
        className="pressable pressable-tight flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <ChevronLeftIcon className="h-[18px] w-[18px]" />
      </button>
      <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
    </div>
  );
}
