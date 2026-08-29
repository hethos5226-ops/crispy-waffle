"use client";

import { useEffect } from "react";
import { recordHistory } from "@/lib/storage";
import type { ListingSnapshot } from "@/lib/data/snapshot";

/**
 * Records that this listing was viewed, capturing its real values so History
 * and Overview can render it later without re-querying eBay.
 */
export function RecordVisit({ snapshot }: { snapshot: ListingSnapshot }) {
  // Keyed on the id so revisiting the same listing refreshes its snapshot,
  // while re-renders of the same page don't rewrite storage repeatedly.
  const key = snapshot.id;

  useEffect(() => {
    recordHistory(snapshot);
    // The snapshot object is rebuilt each render; the id is what identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
