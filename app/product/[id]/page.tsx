import { notFound } from "next/navigation";
import { analyzeById } from "@/lib/analyze";
import { ResultView } from "@/components/ResultView";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = await analyzeById(id);

  if (!analysis) notFound();

  return (
    <main className="px-6 py-8">
      <ResultView analysis={analysis} />
    </main>
  );
}
