export type WizExpression = "smile" | "wink" | "excited" | "thinking";

const EYES: Record<WizExpression, React.ReactNode> = {
  smile: (
    <>
      <circle cx="19" cy="27" r="2.6" fill="#12131a" />
      <circle cx="37" cy="27" r="2.6" fill="#12131a" />
    </>
  ),
  wink: (
    <>
      <circle cx="19" cy="27" r="2.6" fill="#12131a" />
      <path d="M34 27h6" stroke="#12131a" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  excited: (
    <>
      <circle cx="19" cy="26" r="3.2" fill="#12131a" />
      <circle cx="37" cy="26" r="3.2" fill="#12131a" />
    </>
  ),
  thinking: (
    <>
      <circle cx="19" cy="28" r="2.4" fill="#12131a" />
      <circle cx="37" cy="25" r="2.4" fill="#12131a" />
    </>
  ),
};

const MOUTHS: Record<WizExpression, React.ReactNode> = {
  smile: <path d="M20 37q8 7 16 0" stroke="#12131a" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
  wink: <path d="M20 37q8 6 16 0" stroke="#12131a" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
  excited: <ellipse cx="28" cy="39" rx="6" ry="5" fill="#12131a" />,
  thinking: <path d="M22 39q6 2 12 -1" stroke="#12131a" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
};

/**
 * Wiz — BuyWise's original mascot. Drawn as inline SVG (no source asset
 * file was available to embed a pixel-perfect match of the reference
 * artwork), styled to fit the app's own blue/glasses brief.
 */
export function Wiz({ expression = "smile", size = 44, className }: { expression?: WizExpression; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden className={className}>
      <path d="M10 14 L16 1 L23 15 Z" fill="#3355e0" />
      <path d="M46 14 L40 1 L33 15 Z" fill="#3355e0" />
      <path d="M11.5 14 L16 5 L20.5 15" fill="#eef1ff" />
      <path d="M44.5 14 L40 5 L35.5 15" fill="#eef1ff" />
      <circle cx="28" cy="29" r="21" fill="#3f66ee" />
      <path d="M17 35c2 6.5 6.5 10 11 10s9-3.5 11-10" fill="#eef1ff" opacity="0.95" />
      <rect x="11" y="23" width="14" height="10" rx="5" fill="none" stroke="#12131a" strokeWidth="2.2" />
      <rect x="31" y="23" width="14" height="10" rx="5" fill="none" stroke="#12131a" strokeWidth="2.2" />
      <path d="M25 27h6" stroke="#12131a" strokeWidth="2.2" />
      {EYES[expression]}
      <path d="M24 33.5q4 2.2 8 0" stroke="#12131a" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      {MOUTHS[expression]}
    </svg>
  );
}
