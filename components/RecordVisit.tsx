"use client";

import { useEffect } from "react";
import { recordHistory } from "@/lib/storage";

/**
 * Records that this product was viewed, so it shows up in History and counts
 * toward the Overview summary. Rendered by the product page; writes to
 * localStorage on mount, which can only happen on the client.
 */
export function RecordVisit({ productId }: { productId: string }) {
  useEffect(() => {
    recordHistory(productId);
  }, [productId]);

  return null;
}
