import type { Category } from "@/lib/types";

const GRADIENTS: Record<Category, string> = {
  tv: "linear-gradient(135deg,#4f46e5,#0ea5e9)",
  headphones: "linear-gradient(135deg,#db2777,#f97316)",
  phone: "linear-gradient(135deg,#059669,#0ea5e9)",
  laptop: "linear-gradient(135deg,#7c3aed,#db2777)",
  monitor: "linear-gradient(135deg,#0ea5e9,#22c55e)",
};

const ICONS: Record<Category, React.ReactNode> = {
  tv: (
    <path d="M4 5h16v10H4zM9 19h6M12 15v4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  headphones: (
    <path
      d="M4 13v-1a8 8 0 0116 0v1M4 13a2 2 0 002 2h1a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v2zM20 13a2 2 0 01-2 2h-1a1 1 0 01-1-1v-3a1 1 0 011-1h1a1 1 0 011 1v2z"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  phone: (
    <path d="M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  laptop: (
    <path d="M5 5h14v9H5zM3 18h18M9 18l1-4M15 18l-1-4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  monitor: (
    <path d="M4 4h16v11H4zM9 20h6M12 15v5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

export function ProductGlyph({ category, className = "" }: { category: Category; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl ${className}`}
      style={{ background: GRADIENTS[category] }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="white" className="h-1/2 w-1/2 opacity-90">
        {ICONS[category]}
      </svg>
    </div>
  );
}
