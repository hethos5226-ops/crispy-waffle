"use client";

import Image from "next/image";
import { useState } from "react";
import type { Listing } from "@/lib/data/listing";
import { BoxIcon } from "@/components/icons";

/**
 * Retailer photography, with a neutral placeholder when a listing has no
 * image or the remote image fails to load. The placeholder is deliberately
 * generic — guessing a product category from the title would be inventing
 * information eBay didn't give us.
 */
export function ListingImage({
  listing,
  className = "",
  sizes = "80px",
}: {
  listing: Listing;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const image = listing.images[0];

  if (!image || failed) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-surface-muted text-muted ${className}`}>
        <BoxIcon className="h-1/3 w-1/3" />
      </div>
    );
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
