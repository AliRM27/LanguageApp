"use client";

import { useEffect, useMemo, useState } from "react";
import { allTasks, SECTION_LABEL, type Section, type Test } from "@/lib/schema";
import { isAnswered, scoreSection } from "@/lib/scoring";
import { useAttempt } from "@/lib/attempt-store";
import { AudioPlayer } from "./AudioPlayer";
import { TaskRenderer } from "./TaskRenderer";
import { ClozeExplanations, ClozeText } from "./ClozeText";
import { ExamImage } from "./ExamImage";
import { BackLink, Button, ButtonLink, Card, ReadingPanel } from "./ui";

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
        <BackLink href={`/uebungstest/${test.id}`}>Zur Übersicht</BackLink>
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

              {/* Reading material, never tappable — flat and tinted so it
                  cannot be mistaken for the answer options right beneath it.
                  Several short texts (a page of adverts) go side by side, so
                  the questions are not a screen and a half further down. */}
              {!block.inlineGaps && block.stimuli && (
                <div
                  className={
                    block.stimuli.length >= 3
                      ? "grid gap-3 sm:grid-cols-2"
                      : "space-y-3"
                  }
                >
                  {block.stimuli.map((stimulus, i) => (
                    <ReadingPanel key={i} className="h-full">
                      {stimulus.title && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {stimulus.title}
                        </p>
                      )}
                      {stimulus.heading && (
                        <p className="mt-1 text-base font-semibold leading-snug text-slate-900">
                          {stimulus.heading}
                        </p>
                      )}
                      {stimulus.image && (
                        <div className="mt-3">
                          <ExamImage
                            src={stimulus.image.src}
                            alt={stimulus.image.alt}
                          />
                        </div>
                      )}
                      <p className="prose-exam mt-2 text-sm text-slate-800">
                        {stimulus.text}
                      </p>
                    </ReadingPanel>
                  ))}
                </div>
              )}

              {/* Gaps filled inside the text itself. */}
              {block.inlineGaps && block.stimuli?.[0] && (
                <div>
                  {block.stimuli[0].heading && (
                    <p className="mb-2 text-base font-semibold text-slate-900">
                      {block.stimuli[0].heading}
                    </p>
                  )}
                  <ClozeText
                    text={block.stimuli[0].text}
                    tasks={block.tasks}
                    optionPool={block.optionPool}
                    mode={mode}
                    answers={attempt.answers}
                    onChange={setAnswer}
                  />
                  {mode === "review" && (
                    <ClozeExplanations tasks={block.tasks} />
                  )}
                </div>
              )}

              {/* The printed a–f list. Reference material, never tappable —
                  the learner chooses a letter in each question below. */}
              {block.showOptionList && block.optionPool && (
                <ReadingPanel>
                  <ul className="space-y-2.5">
                    {block.optionPool.map((option) => (
                      <li key={option.id} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-300">
                          {option.id}
                        </span>
                        <span className="text-sm leading-relaxed text-slate-800">
                          {option.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ReadingPanel>
              )}

              {/* Inline gaps are already answerable in the text above; listing
                  them again would ask the same question twice. They still count
                  towards the running number so the totals stay honest. */}
              {block.inlineGaps ? (
                (() => {
                  taskNumber += block.tasks.length;
                  return null;
                })()
              ) : (
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
                      letteredOptions={block.showOptionList}
                      value={attempt.answers[task.id]}
                      onChange={(value) => setAnswer(task.id, value)}
                      selfRating={attempt.selfAssessment[task.id]}
                      onSelfRating={(rating) => setSelfRating(task.id, rating)}
                    />
                  );
                  })}
                </ol>
              )}
            </div>
          ))}
        </Card>
      ))}

      {/*
        Pinned to the bottom on phones.

        A Lesen section is several screens long, so both the "how many have I
        done" count and the submit button used to live somewhere far below the
        fold — the learner had to scroll to the end to find out where they were.
        Sticky puts the progress and the action permanently in reach of a thumb.
        `pb-[env(safe-area-inset-bottom)]` keeps it clear of the iPhone home bar.
      */}
      <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:px-4 sm:py-4 sm:backdrop-blur-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {submitted
              ? "Dieser Teil ist abgegeben."
              : `${tasks.length - unanswered} von ${tasks.length} Aufgaben bearbeitet`}
            {syncing && <span className="ml-2 text-xs">· wird gespeichert …</span>}
          </p>

          <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
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
