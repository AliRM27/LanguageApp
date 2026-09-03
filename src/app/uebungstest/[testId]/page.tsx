import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isInProgress, getAllTests, getTest } from "@/lib/content";
import { TestOverview } from "@/components/TestOverview";
import { canonical } from "@/lib/site";

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
  if (!test) return {};
  return {
    title: test.title,
    description: test.description,
    alternates: canonical(`/uebungstest/${test.id}`),
  };
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = getTest(testId);
  if (!test || isInProgress(test)) notFound();

  return <TestOverview test={test} />;
}
