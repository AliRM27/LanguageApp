import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLevels,
  getTestsByLevel,
  LEVEL_DESCRIPTION,
  levelSlug,
  parseLevelSlug,
} from "@/lib/content";
import { Badge, Card } from "@/components/ui";
import { SECTION_LABEL, allTasks } from "@/lib/schema";

export function generateStaticParams() {
  return getLevels().map(({ level }) => ({ level: levelSlug(level) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const level = parseLevelSlug((await params).level);
  if (!level) return {};
  return {
    title: `Übungstests ${level}`,
    description: `Kostenlose Übungstests auf Niveau ${level} mit Hören, Lesen, Schreiben und Sprechen. ${LEVEL_DESCRIPTION[level]}`,
  };
}

export default async function LevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const level = parseLevelSlug((await params).level);
  if (!level) notFound();

  const tests = getTestsByLevel(level);
  if (tests.length === 0) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/uebungstests" className="text-sm text-brand-600 hover:underline">
          ← Alle Niveaus
        </Link>
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-base font-semibold text-brand-700">
            {level}
          </span>
          <h1 className="text-3xl font-semibold text-slate-900">
            Übungstests {level}
          </h1>
        </div>
        <p className="text-slate-600">{LEVEL_DESCRIPTION[level]}</p>
        <p className="text-sm text-slate-500">
          Jeder Test besteht aus vier Teilen. Sie können jederzeit pausieren – Ihr
          Fortschritt bleibt erhalten.
        </p>
      </header>

      <ul className="space-y-3">
        {tests.map((test) => {
          const taskCount = test.sections.reduce(
            (sum, section) => sum + allTasks(section).length,
            0,
          );

          return (
            <li key={test.id}>
              <Link href={`/uebungstest/${test.id}`} className="block">
                <Card className="transition hover:border-brand-300 hover:shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {test.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {test.description}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        {test.sections
                          .map((section) => SECTION_LABEL[section.kind])
                          .join(" · ")}{" "}
                        — {taskCount} Aufgaben
                      </p>
                    </div>
                    <Badge tone="info">{test.level}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
