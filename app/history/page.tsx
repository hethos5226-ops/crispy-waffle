import { HistoryList } from "@/components/HistoryList";

export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <h1 className="text-[26px] font-extrabold tracking-tight">History</h1>
      <div className="mt-4">
        <HistoryList />
      </div>
    </main>
  );
}
