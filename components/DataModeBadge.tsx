import { isMockMode } from "@/lib/data/mode";

/**
 * States plainly where the app's product data is coming from. In live mode
 * that's eBay; the badge only says "Demo data" when the app really is
 * running on the development catalog.
 */
export function DataModeBadge() {
  const mock = isMockMode();

  return (
    <span
      className="rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide"
      style={
        mock
          ? { borderColor: "var(--wait)", color: "var(--wait)", backgroundColor: "var(--wait-soft)" }
          : { borderColor: "var(--border)", color: "var(--muted)" }
      }
    >
      {mock ? "Demo data" : "Live eBay data"}
    </span>
  );
}
