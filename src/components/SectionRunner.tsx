"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { allTasks, SECTION_LABEL, type Section, type Test } from "@/lib/schema";
import { isAnswered, scoreSection } from "@/lib/scoring";
import { useAttempt } from "@/lib/attempt-store";
import { AudioPlayer } from "./AudioPlayer";
import { TaskRenderer } from "./TaskRenderer";
import { Button, ButtonLink, Card } from "./ui";

export function SectionRunner({
  test,
  section,
  nextKind,
}: {
  test: Test;
  section: Section;
  nextKind?: string;
}) {
  const { attempt, loaded, syncing, setAnswer, setSelfRating, submitSection } =
    useAttempt(test.id);

  const submitted = attempt.submittedSections.includes(section.kind);
  const mode = submitted ? "review" : "input";
  const tasks = useMemo(() => allTasks(section), [section]);
  const score = scoreSection(section, attempt.answers);

  const unanswered = tasks.filter(
    (task) => !isAnswered(task, attempt.answers[task.id]),
  ).length;

  const handleSubmit = () => {
    if (
      unanswered > 0 &&
      !window.confirm(
        `${unanswered} Aufgabe(n) sind noch nicht bearbeitet. Trotzdem abgeben?`,
      )
    ) {
      return;
    }
    // The score is already on screen; recording it here is what lets
    // "Mein Bereich" show results without ever loading the answer keys.
    submitSection(section.kind, { correct: score.correct, total: score.total });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!loaded) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">Wird geladen …</div>
    );
  }

  let taskNumber = 0;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href={`/uebungstest/${test.id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          ← Zurück zur Übersicht
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{test.title}</p>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              {SECTION_LABEL[section.kind]}
            </h1>
          </div>
          <Timer minutes={section.durationMinutes} paused={submitted} />
        </div>
        <p className="text-sm text-slate-600">{section.description}</p>
      </header>

      {submitted && <SectionSummary section={section} score={score} />}

      {section.parts.map((part) => (
        <Card key={part.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{part.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{part.instructions}</p>
          </div>

          {part.audio && (
            <>
              <AudioPlayer src={part.audio.src} label={part.title} />
              {submitted && (
                <details className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Hörtext anzeigen
                  </summary>
                  <p className="prose-exam mt-3 text-sm text-slate-700">
                    {part.audio.transcript}
                  </p>
                </details>
              )}
            </>
          )}

          {/* A block is a text plus the questions about it, so the two stay
              together: e-mail, its questions, next e-mail, its questions. */}
          {part.blocks.map((block) => (
            <div key={block.id} className="space-y-3">
              {block.prompt && (
                <p className="font-medium text-slate-900">{block.prompt}</p>
              )}

              {block.stimuli?.map((stimulus, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  {stimulus.title && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {stimulus.title}
                    </p>
                  )}
                  <p className="prose-exam text-sm text-slate-800">
                    {stimulus.text}
                  </p>
                </div>
              ))}

              <ol className="space-y-3">
                {block.tasks.map((task) => {
                  taskNumber += 1;
                  return (
                    <TaskRenderer
                      key={task.id}
                      task={task}
                      index={taskNumber}
                      mode={mode}
                      optionPool={block.optionPool}
                      value={attempt.answers[task.id]}
                      onChange={(value) => setAnswer(task.id, value)}
                      selfRating={attempt.selfAssessment[task.id]}
                      onSelfRating={(rating) => setSelfRating(task.id, rating)}
                    />
                  );
                })}
              </ol>
            </div>
          ))}
        </Card>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          {submitted
            ? "Dieser Teil ist abgegeben."
            : `${tasks.length - unanswered} von ${tasks.length} Aufgaben bearbeitet`}
          {syncing && <span className="ml-2 text-xs">· wird gespeichert …</span>}
        </p>

        <div className="flex gap-2">
          {!submitted && <Button onClick={handleSubmit}>Teil abgeben</Button>}
          {submitted && nextKind && (
            <ButtonLink href={`/uebungstest/${test.id}/${nextKind}`}>
              Weiter zu{" "}
              {SECTION_LABEL[nextKind as keyof typeof SECTION_LABEL] ?? nextKind}
            </ButtonLink>
          )}
          {submitted && !nextKind && (
            <ButtonLink href={`/uebungstest/${test.id}/ergebnis`}>
              Gesamtergebnis ansehen
            </ButtonLink>
          )}
          {submitted && (
            <ButtonLink href={`/uebungstest/${test.id}`} variant="secondary">
              Übersicht
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionSummary({
  section,
  score,
}: {
  section: Section;
  score: ReturnType<typeof scoreSection>;
}) {
  const autoScored = score.total > 0;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
      {autoScored ? (
        <>
          <p className="text-sm text-brand-700">Ihr Ergebnis in diesem Teil</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {score.correct} / {score.total}
            <span className="ml-2 text-lg font-normal text-slate-600">
              ({score.percent}%)
            </span>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-brand-700">
            Dieser Teil wird nicht automatisch bewertet.
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Vergleichen Sie Ihre Antworten mit der Musterlösung unter jeder
            Aufgabe. {SECTION_LABEL[section.kind]} bewertet Ihre Lehrerin oder Ihr
            Lehrer am besten persönlich.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Counts up rather than down, and never blocks: this is an Übungstest, and a
 * hard cut-off would punish beginners for looking words up. The recommended
 * exam time is shown for orientation.
 */
function Timer({ minutes, paused }: { minutes: number; paused: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const over = seconds > minutes * 60;
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  return (
    <div className="text-right">
      <p
        className={`text-xl font-semibold tabular-nums ${
          over ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {mm}:{ss.toString().padStart(2, "0")}
      </p>
      <p className="text-xs text-slate-500">
        empfohlen: {minutes} Min.
      </p>
    </div>
  );
}
