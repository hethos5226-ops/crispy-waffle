import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-muted">That product isn&apos;t in the BuyWise MVP catalog.</p>
      <Link href="/" className="text-sm font-semibold underline underline-offset-4">
        Back to search
      </Link>
    </main>
  );
}
