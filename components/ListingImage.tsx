"use client";

import Image from "next/image";
import { useState } from "react";
import type { Listing } from "@/lib/data/listing";
import { ProductGlyph } from "@/components/ProductGlyph";

/**
 * Real retailer photography, falling back to the existing category glyph if
 * the listing has no image or the remote image fails — so the layout never
 * collapses and the app keeps its own look when imagery is missing.
 */
export function ListingImage({ listing, className = "", sizes = "80px" }: { listing: Listing; className?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  const image = listing.images[0];

  if (!image || failed) {
    return <ProductGlyph category="tv" className={className} />;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-surface-muted ${className}`}>
      <Image
        src={image.url}
        alt={listing.title}
        fill
        sizes={sizes}
        className="object-contain"
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  );
}
