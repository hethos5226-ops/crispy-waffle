import Image from "next/image";
import { asset } from "@/lib/asset";

/**
 * Wiz — the BuyWise mascot. Each pose is a supplied PNG in /public/wiz.
 * `head` is the cropped face used for small chrome (header, inline avatars);
 * the rest are full-body poses for larger moments.
 */
export type WizPose =
  | "head"
  | "wave"
  | "thumbsUp"
  | "magnify"
  | "pointing"
  | "tablet"
  | "shoppingBag";

/** Intrinsic sizes of the optimized source files, so Image gets a correct aspect ratio. */
const POSES: Record<WizPose, { file: string; width: number; height: number }> = {
  head: { file: "/wiz/head.png", width: 160, height: 146 },
  wave: { file: "/wiz/wave.png", width: 223, height: 325 },
  thumbsUp: { file: "/wiz/thumbs-up.png", width: 240, height: 322 },
  magnify: { file: "/wiz/magnify.png", width: 201, height: 323 },
  pointing: { file: "/wiz/pointing.png", width: 227, height: 335 },
  tablet: { file: "/wiz/tablet.png", width: 260, height: 325 },
  shoppingBag: { file: "/wiz/shopping-bag.png", width: 223, height: 325 },
};

export function Wiz({
  pose = "head",
  size = 44,
  className = "",
  priority = false,
}: {
  pose?: WizPose;
  /** Rendered height in px; width follows the pose's aspect ratio. */
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const { file, width, height } = POSES[pose];
  const renderedWidth = Math.round((width / height) * size);

  return (
    <Image
      src={asset(file)}
      alt=""
      aria-hidden
      width={renderedWidth}
      height={size}
      priority={priority}
      className={`select-none ${className}`}
      style={{ height: size, width: renderedWidth }}
    />
  );
}
