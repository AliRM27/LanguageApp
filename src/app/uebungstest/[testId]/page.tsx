import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllTests, getTest } from "@/lib/content";
import { TestOverview } from "@/components/TestOverview";

export function generateStaticParams() {
  return getAllTests().map((test) => ({ testId: test.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ testId: string }>;
}): Promise<Metadata> {
  const { testId } = await params;
  const test = getTest(testId);
  if (!test) return {};
  return { title: test.title, description: test.description };
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;
  const test = getTest(testId);
  if (!test) notFound();

  return <TestOverview test={test} />;
}
