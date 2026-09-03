import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isInProgress, getAllTests, getTest } from "@/lib/content";
import { ResultsView } from "@/components/ResultsView";

export function generateStaticParams() {
  return getAllTests().filter((t) => !isInProgress(t)).map((test) => ({ testId: test.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ testId: string }>;
}): Promise<Metadata> {
  const { testId } = await params;
  const test = getTest(testId);
  return { title: test ? `Ergebnis – ${test.title}` : "Ergebnis" };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = getTest(testId);
  if (!test || isInProgress(test)) notFound();

  return <ResultsView test={test} />;
}
