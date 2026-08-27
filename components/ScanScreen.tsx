"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ScanIcon } from "@/components/icons";
import type { Product } from "@/lib/types";

export function ScanScreen({ products }: { products: Product[] }) {
  const router = useRouter();
  const rotation = useRef(0);

  return (
    <div className="flex flex-col items-center gap-5 px-6 pb-4 pt-10 text-center">
      <div className="relative flex h-[220px] w-[220px] items-center justify-center rounded-[28px] border-2 border-dashed border-border text-muted">
        <span className="pointer-events-none absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-accent" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-accent" />
        <span className="scan-line pointer-events-none absolute left-[12%] right-[12%] h-0.5 rounded-full bg-accent opacity-85" />
        <ScanIcon className="h-9 w-9" />
      </div>
      <div>
        <p className="text-[15px] font-bold">Point your camera at a barcode</p>
        <p className="mt-1 max-w-[280px] text-[13.5px] text-muted">
          Scanning opens your camera and reads a product&apos;s barcode automatically. Tap below to try a sample result.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          const product = products[rotation.current % products.length];
          rotation.current += 1;
          router.push(`/product/${product.id}`);
        }}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-95"
      >
        Simulate scan
      </button>
    </div>
  );
}
