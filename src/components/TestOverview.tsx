"use client";

import { allTasks, levelSlug, SECTION_LABEL, type Test } from "@/lib/schema";
import { scoreSection } from "@/lib/scoring";
import { useAttempt } from "@/lib/attempt-store";
import { BackLink, Badge, Button, ButtonLink, Card } from "./ui";

export function TestOverview({ test }: { test: Test }) {
  const { attempt, loaded, reset } = useAttempt(test.id);

  const done = attempt.submittedSections.length;
  const allDone = done === test.sections.length;
  const nextSection =
    test.sections.find((s) => !attempt.submittedSections.includes(s.kind)) ??
    test.sections[0];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <BackLink href={`/uebungstests/${levelSlug(test.level)}`}>
          Alle Übungstests {test.level}
        </BackLink>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold text-slate-900">{test.title}</h1>
          <Badge tone="info">{test.level}</Badge>
        </div>
        <p className="text-slate-600">{test.description}</p>
      </header>

      {loaded && done > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
          <p className="text-slate-700">
            {allDone
              ? "Sie haben alle vier Teile abgegeben."
              : `${done} von ${test.sections.length} Teilen abgegeben.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {allDone && (
              <ButtonLink href={`/uebungstest/${test.id}/ergebnis`}>
                Gesamtergebnis ansehen
              </ButtonLink>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (window.confirm("Alle Antworten in diesem Test löschen?")) reset();
              }}
            >
              Test zurücksetzen
            </Button>
          </div>
        </div>
      )}

      <ol className="space-y-3">
        {test.sections.map((section, index) => {
          const submitted = attempt.submittedSections.includes(section.kind);
          const score = scoreSection(section, attempt.answers);
          const taskCount = allTasks(section).length;

          return (
            <li key={section.kind}>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {SECTION_LABEL[section.kind]}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {taskCount} Aufgaben · ca. {section.durationMinutes} Min.
                    </p>
                    {loaded && submitted && (
                      <p className="mt-2 text-sm">
                        {score.total > 0 ? (
                          <Badge tone="success">
                            {score.correct} / {score.total} richtig
                          </Badge>
                        ) : (
                          <Badge>Abgegeben – mit Musterlösung vergleichen</Badge>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <ButtonLink
                  href={`/uebungstest/${test.id}/${section.kind}`}
                  variant={
                    loaded && nextSection?.kind === section.kind
                      ? "primary"
                      : "secondary"
                  }
                >
                  {submitted ? "Ansehen" : "Starten"}
                </ButtonLink>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
