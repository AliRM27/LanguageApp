import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLevels,
  getTestsByLevel,
  LEVEL_DESCRIPTION,
  levelSlug,
  parseLevelSlug,
  isInProgress,
} from "@/lib/content";
import { BackLink, Badge, Card, InProgressBadge } from "@/components/ui";
import { SECTION_LABEL, allTasks } from "@/lib/schema";
import { canonical } from "@/lib/site";

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
    alternates: canonical(`/uebungstests/${levelSlug(level)}`),
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
        <BackLink href="/uebungstests">Alle Niveaus</BackLink>
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

          const inArbeit = isInProgress(test);

          const inhalt = (
            <Card
              className={
                inArbeit
                  ? "bg-slate-50"
                  : "transition hover:border-brand-300 hover:shadow"
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className={
                      inArbeit
                        ? "font-semibold text-slate-500"
                        : "font-semibold text-slate-900"
                    }
                  >
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
                  {inArbeit && (
                    <p className="mt-3 text-sm text-amber-900">
                      Dieser Übungstest ist noch nicht fertig. Die Aufgaben
                      stehen schon, es fehlen aber noch die Tonaufnahmen.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge tone="info">{test.level}</Badge>
                  {inArbeit && <InProgressBadge />}
                </div>
              </div>
            </Card>
          );

          // Kein Link, wenn der Test noch nicht benutzbar ist: Ein Klick, der
          // auf einer halbfertigen Seite endet, ist ärgerlicher als eine Karte,
          // die von vornherein sagt, dass sie noch nicht dran ist.
          return (
            <li key={test.id}>
              {inArbeit ? (
                inhalt
              ) : (
                <Link href={`/uebungstest/${test.id}`} className="block">
                  {inhalt}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
