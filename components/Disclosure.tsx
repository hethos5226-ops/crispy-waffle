"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

export function Disclosure({
  trigger,
  children,
  className = "",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3.5 flex w-full items-center justify-between gap-2.5 border-t border-border pt-3.5 text-left text-[13px] font-semibold text-muted pressable hover:text-foreground"
      >
        {trigger}
        <ChevronDownIcon className={`h-[15px] w-[15px] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`dcontent ${open ? "open" : ""}`}>
        <div>{children}</div>
      </div>
    </div>
  );
}
