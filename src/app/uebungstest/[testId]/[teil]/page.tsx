import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isInProgress, getAllTests, getSection, nextSectionKind } from "@/lib/content";
import { SECTION_LABEL, type SectionKind } from "@/lib/schema";
import { SectionRunner } from "@/components/SectionRunner";
import { canonical } from "@/lib/site";

export function generateStaticParams() {
  return getAllTests().filter((t) => !isInProgress(t)).flatMap((test) =>
    test.sections.map((section) => ({ testId: test.id, teil: section.kind })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ testId: string; teil: string }>;
}): Promise<Metadata> {
  const { testId, teil } = await params;
  const found = getSection(testId, teil);
  if (!found) return {};
  return {
    title: `${SECTION_LABEL[found.section.kind]} – ${found.test.title}`,
    description: found.section.description,
    alternates: canonical(`/uebungstest/${found.test.id}/${found.section.kind}`),
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ testId: string; teil: string }>;
}) {
  const { testId, teil } = await params;
  const found = getSection(testId, teil);
  if (!found || isInProgress(found.test)) notFound();

  const next = nextSectionKind(found.test, found.section.kind as SectionKind);

  return (
    <SectionRunner test={found.test} section={found.section} nextKind={next} />
  );
}
