"use client";

import { SECTION_LABEL, type Test } from "@/lib/schema";
import { PASS_THRESHOLD_PERCENT, scoreTest } from "@/lib/scoring";
import { useAttempt } from "@/lib/attempt-store";
import { BackLink, Badge, Button, ButtonLink, Card } from "./ui";

export function ResultsView({ test }: { test: Test }) {
  const { attempt, loaded, reset } = useAttempt(test.id);

  if (!loaded) {
    return <p className="py-16 text-center text-sm text-slate-500">Wird geladen …</p>;
  }

  const result = scoreTest(test, attempt.answers);
  const passed =
    result.percent !== null && result.percent >= PASS_THRESHOLD_PERCENT;
  const openSections = test.sections.filter(
    (section) => !attempt.submittedSections.includes(section.kind),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <BackLink href={`/uebungstest/${test.id}`}>Zur Übersicht</BackLink>
        <h1 className="text-3xl font-semibold text-slate-900">Ihr Ergebnis</h1>
        <p className="text-slate-600">{test.title}</p>
      </header>

      <Card className="text-center">
        <p className="text-sm text-slate-500">Hören und Lesen zusammen</p>
        <p className="mt-2 text-5xl font-semibold text-slate-900">
          {result.percent ?? 0}%
        </p>
        <p className="mt-2 text-slate-600">
          {result.correct} von {result.total} Aufgaben richtig
        </p>
        <div className="mt-4">
          {passed ? (
            <Badge tone="success">
              Über {PASS_THRESHOLD_PERCENT}% – das ist ein gutes Ergebnis
            </Badge>
          ) : (
            <Badge tone="neutral">
              Ziel: mindestens {PASS_THRESHOLD_PERCENT}%
            </Badge>
          )}
        </div>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-slate-500">
          Schreiben und Sprechen fließen hier nicht ein – diese Teile bewerten Sie
          selbst mit der Musterlösung oder besprechen sie im Kurs.
        </p>
      </Card>

      {openSections.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Noch nicht abgegeben:{" "}
          {openSections.map((s) => SECTION_LABEL[s.kind]).join(", ")}. Das Ergebnis
          ist deshalb noch nicht vollständig.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Nach Teilen</h2>
        <ul className="space-y-3">
          {result.sections.map((section) => {
            const submitted = attempt.submittedSections.includes(section.kind);
            const autoScored = section.score.total > 0;

            return (
              <li key={section.kind}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {SECTION_LABEL[section.kind]}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {!submitted
                        ? "Noch nicht abgegeben"
                        : autoScored
                          ? `${section.score.correct} von ${section.score.total} richtig (${section.score.percent}%)`
                          : `${section.score.answered} von ${section.score.taskCount} Aufgaben bearbeitet · Musterlösung vergleichen`}
                    </p>
                    {autoScored && submitted && (
                      <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${section.score.percent ?? 0}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <ButtonLink
                    href={`/uebungstest/${test.id}/${section.kind}`}
                    variant="secondary"
                  >
                    {submitted ? "Lösungen ansehen" : "Jetzt bearbeiten"}
                  </ButtonLink>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/uebungstests" variant="secondary">
          Weitere Übungstests
        </ButtonLink>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm("Alle Antworten in diesem Test löschen?")) reset();
          }}
        >
          Test zurücksetzen
        </Button>
      </div>
    </div>
  );
}
