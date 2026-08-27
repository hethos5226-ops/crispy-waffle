import { SubPageHeader } from "@/components/SubPageHeader";
import { Wiz } from "@/components/Wiz";

const STORED = [
  { label: "Search & scan history", detail: "The products you've looked up, so History and Overview can show them." },
  { label: "Favourites", detail: "Products you've starred." },
  { label: "Appearance", detail: "Whether you chose System, Light or Dark." },
  { label: "Intro state", detail: "Whether you've already seen Wiz's intro." },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <SubPageHeader title="Privacy" />

      <div
        className="mb-6 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-5"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <Wiz pose="shoppingBag" size={82} />
        <p className="text-[14px] leading-relaxed text-muted">
          Short version: BuyWise has no accounts and no server storing your activity. Everything you do here stays on
          this device.
        </p>
      </div>

      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">What&apos;s stored on your device</h2>
      <div
        className="overflow-hidden rounded-[22px] border border-border bg-surface"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        {STORED.map((item, i) => (
          <div key={item.label} className={`p-4 ${i > 0 ? "border-t border-border" : ""}`}>
            <h3 className="text-[14.5px] font-semibold">{item.label}</h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{item.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        These are kept in your browser&apos;s local storage. They&apos;re never uploaded, never sent to us, and never
        shared with anyone else. Clearing them (Settings → Reset history &amp; favourites, or clearing site data)
        removes them permanently — there&apos;s no copy anywhere else to restore from.
      </p>

      <h2 className="mb-3 mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">
        What we don&apos;t collect
      </h2>
      <div
        className="flex flex-col gap-3 rounded-[22px] border border-border bg-surface p-5 text-[13.5px] leading-relaxed text-muted"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <p>No account, name, email address or phone number — there&apos;s no sign-up.</p>
        <p>No analytics, advertising or third-party tracking scripts.</p>
        <p>No location data, contacts, or camera access. The Scan screen is a demo and never opens your camera.</p>
        <p>No payment details. BuyWise doesn&apos;t sell anything or process transactions.</p>
      </div>

      <h2 className="mb-3 mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">Hosting</h2>
      <div
        className="rounded-[22px] border border-border bg-surface p-5 text-[13.5px] leading-relaxed text-muted"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <p>
          This build is served as static files from GitHub Pages. Like any web host, GitHub receives standard request
          information (such as your IP address) in order to serve the page — that&apos;s covered by GitHub&apos;s own
          privacy practices, not by BuyWise. We don&apos;t operate a backend, so no request you make here is logged or
          stored by us.
        </p>
      </div>

      <h2 className="mb-3 mt-7 text-[13px] font-bold uppercase tracking-wide text-muted">If that changes</h2>
      <div
        className="rounded-[22px] border border-border bg-surface p-5 text-[13.5px] leading-relaxed text-muted"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <p>
          Features like price-drop alerts or saved products across devices would need accounts and a server. If BuyWise
          ever adds those, this page will say exactly what is collected and why, before the feature ships.
        </p>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        This page describes how the current demo build actually behaves. It isn&apos;t a legally reviewed privacy
        policy — a real one should be drafted before BuyWise handles anyone&apos;s data for real.
      </p>
    </main>
  );
}
