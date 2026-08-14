"use client";

import { useState, type ReactNode } from "react";
import type {
  GapTask,
  MatchingTask,
  MultipleChoiceTask,
  SpeakingTask,
  Task,
  TrueFalseTask,
  WritingTask,
} from "@/lib/schema";
import type { AnswerValue, SelfRating } from "@/lib/scoring";
import { isCorrect } from "@/lib/scoring";
import { Badge } from "./ui";

/**
 * One renderer per task type. Adding an exam format means adding a case here
 * and a member to the schema union — nothing else in the app changes.
 */

export interface TaskProps {
  task: Task;
  index: number;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** `input` while working, `review` after the section is submitted. */
  mode: "input" | "review";
  /** Shared answer options, supplied by the enclosing block. */
  optionPool?: { id: string; text: string }[];
  /**
   * True when the block prints the options as an a–f list. The dropdown then
   * leads with the letter, so a sentence truncated on a narrow phone can still
   * be matched against the printed list.
   */
  letteredOptions?: boolean;
  selfRating?: SelfRating;
  onSelfRating?: (rating: SelfRating) => void;
}

export function TaskRenderer(props: TaskProps) {
  const { task, index, mode, value } = props;
  const correct = mode === "review" ? isCorrect(task, value) : undefined;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {index}
        </span>
        <div className="flex-1">
          {/* A gap task's prompt IS the sentence the input sits inside, so it
              is rendered by the body rather than above it. */}
          {task.type !== "luecke" && <TaskPrompt task={task} />}
        </div>
        {correct === true && <Badge tone="success">Richtig</Badge>}
        {correct === false && <Badge tone="error">Falsch</Badge>}
      </div>

      {/* The 36px indent lines the body up under the prompt on a desktop, but
          on a 375px phone it costs a tenth of the width of every option. */}
      <div className="sm:pl-9">
        <TaskBody {...props} />
        {mode === "review" && "explanation" in task && task.explanation && (
          <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
            {task.explanation}
          </p>
        )}
      </div>
    </li>
  );
}

function TaskPrompt({ task }: { task: Task }) {
  const text = task.type === "richtig-falsch" ? task.statement : task.prompt;
  return <p className="font-medium text-slate-900">{text}</p>;
}

function TaskBody(props: TaskProps) {
  switch (props.task.type) {
    case "multiple-choice":
      return <MultipleChoice {...props} task={props.task} />;
    case "richtig-falsch":
      return <TrueFalse {...props} task={props.task} />;
    case "zuordnung":
      return <Matching {...props} task={props.task} />;
    case "luecke":
      return <Gap {...props} task={props.task} />;
    case "schreiben":
      return <Writing {...props} task={props.task} />;
    case "sprechen":
      return <Speaking {...props} task={props.task} />;
  }
}

/* ------------------------------ auto-scored ------------------------------- */

type OptionState = "idle" | "selected" | "right" | "wrong";

/**
 * An answer option.
 *
 * The old version was a white box with a hairline border — indistinguishable
 * from a Card or from the exam text sitting right above it. On a Lesen page
 * that means the advert and the answers about it looked like the same kind of
 * thing, and nothing said "tap me".
 *
 * Two fixes: a visible border and tinted fill so it reads as a control, and a
 * radio glyph (below) that fills in when chosen. The glyph does most of the
 * work — a circle in front of a line of text is understood everywhere, in any
 * language, which matters when the reader is at A1.
 */
function optionClass(state: OptionState) {
  const map = {
    idle: "border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50 active:bg-brand-50",
    selected: "border-brand-600 bg-brand-50 ring-1 ring-brand-600",
    right: "border-emerald-500 bg-emerald-50",
    wrong: "border-rose-400 bg-rose-50",
  } as const;
  return `flex w-full min-h-12 items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition ${map[state]}`;
}

/** The circle in front of an option: empty, or filled once chosen. */
function OptionMark({
  state,
  children,
}: {
  state: OptionState;
  children?: ReactNode;
}) {
  const chosen = state === "selected" || state === "right" || state === "wrong";
  const tone = {
    idle: "border-slate-400 bg-white text-slate-600",
    selected: "border-brand-600 bg-brand-600 text-white",
    right: "border-emerald-600 bg-emerald-600 text-white",
    wrong: "border-rose-500 bg-rose-500 text-white",
  }[state];

  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold uppercase transition ${tone}`}
    >
      {chosen && !children ? "✓" : children}
    </span>
  );
}

function MultipleChoice({
  task,
  value,
  onChange,
  mode,
}: TaskProps & { task: MultipleChoiceTask }) {
  return (
    <div className="space-y-2">
      {task.options.map((option) => {
        const selected = value === option.id;
        let state: "idle" | "selected" | "right" | "wrong" = selected
          ? "selected"
          : "idle";
        if (mode === "review") {
          if (option.id === task.solution) state = "right";
          else if (selected) state = "wrong";
          else state = "idle";
        }
        return (
          <button
            key={option.id}
            type="button"
            disabled={mode === "review"}
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={optionClass(state)}
          >
            <OptionMark state={state}>{option.id}</OptionMark>
            <span>{option.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalse({
  task,
  value,
  onChange,
  mode,
}: TaskProps & { task: TrueFalseTask }) {
  const choices = [
    { value: true, label: "Richtig" },
    { value: false, label: "Falsch" },
  ];
  return (
    // Two equal halves rather than two small pills: on a phone these are the
    // most-tapped controls in the whole app.
    <div className="grid grid-cols-2 gap-3">
      {choices.map((choice) => {
        const selected = value === choice.value;
        let state: OptionState = selected ? "selected" : "idle";
        if (mode === "review") {
          if (choice.value === task.solution) state = "right";
          else if (selected) state = "wrong";
        }
        return (
          <button
            key={String(choice.value)}
            type="button"
            disabled={mode === "review"}
            aria-pressed={selected}
            onClick={() => onChange(choice.value)}
            className={`${optionClass(state)} justify-center font-medium`}
          >
            <OptionMark state={state} />
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

function Matching({
  task,
  value,
  onChange,
  mode,
  optionPool,
  letteredOptions,
}: TaskProps & { task: MatchingTask }) {
  const options = optionPool ?? [];
  const label = (option: { id: string; text: string }) =>
    letteredOptions ? `${option.id} – ${option.text}` : option.text;
  const chosen = typeof value === "string" ? value : "";
  const wrong = mode === "review" && chosen !== task.solution;

  return (
    <div>
      <select
        value={chosen}
        disabled={mode === "review"}
        onChange={(e) => onChange(e.target.value)}
        // Left as a native select on purpose: phones render it as a full-screen
        // picker, which beats any custom dropdown for one-handed use.
        className="min-h-12 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-base disabled:bg-slate-50 sm:text-sm"
      >
        <option value="">Bitte wählen …</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {label(option)}
          </option>
        ))}
      </select>

      {mode === "review" && wrong && (
        <p className="mt-2 text-xs text-rose-700">
          Richtig wäre:{" "}
          {(() => {
            const right = options.find((o) => o.id === task.solution);
            return right ? label(right) : task.solution;
          })()}
        </p>
      )}
    </div>
  );
}

/**
 * Gap in a note or form. Rendered as the line itself with a writing space, so
 * it looks like the notepad the learner is completing rather than a quiz field.
 */
function Gap({ task, value, onChange, mode }: TaskProps & { task: GapTask }) {
  const text = typeof value === "string" ? value : "";
  const correct = mode === "review" ? isCorrect(task, value) : undefined;

  // "Der Techniker kommt am ___ zwischen 9 und 12 Uhr." — the input goes where
  // the marker is, so the learner reads a sentence and sees exactly what is
  // missing from it.
  const [before, after = ""] = task.prompt.split(/_{2,}/);

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-2 font-medium text-slate-900">
        {before && <span>{before.trim()}</span>}
        <input
          type="text"
          value={text}
          disabled={mode === "review"}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Fehlende Information"
          // text-base on phones: anything under 16px makes iOS Safari zoom in
          // when the field is focused, which throws the whole page sideways
          // mid-sentence. min-h-11 keeps it thumb-sized.
          className={`min-h-11 min-w-[8rem] max-w-full flex-1 rounded-lg border-2 px-3 py-2 text-base font-normal disabled:bg-slate-50 sm:text-sm ${
            correct === true
              ? "border-emerald-500 bg-emerald-50"
              : correct === false
                ? "border-rose-400 bg-rose-50"
                : "border-slate-300 focus:border-brand-500"
          }`}
        />
        {after && <span>{after.trim()}</span>}
      </p>

      {mode === "review" && correct === false && (
        <p className="mt-2 text-xs text-rose-700">
          Richtig wäre: <strong>{task.solution}</strong>
        </p>
      )}
    </div>
  );
}

/* ----------------------------- self-assessed ------------------------------ */

/** Leitpunkte: shown while writing, and as a self-check after submitting. */
function Criteria({
  criteria,
  mode,
}: {
  criteria: string[];
  mode: "input" | "review";
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (mode === "input") {
    return (
      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Schreiben Sie etwas zu diesen {criteria.length} Punkten
        </p>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700">
          {criteria.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Selbstkontrolle: Haben Sie alle Punkte behandelt?
      </p>
      <ul className="space-y-1.5">
        {criteria.map((item, i) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={(e) => {
                  const next = new Set(checked);
                  if (e.target.checked) next.add(i);
                  else next.delete(i);
                  setChecked(next);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span className={checked.has(i) ? "text-slate-400 line-through" : ""}>
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Hints({ hints }: { hints?: string[] }) {
  if (!hints?.length) return null;
  return (
    <ul className="mb-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      {hints.map((hint) => (
        <li key={hint} className="flex gap-2">
          <span aria-hidden className="text-slate-400">
            •
          </span>
          {hint}
        </li>
      ))}
    </ul>
  );
}

function Writing({
  task,
  value,
  onChange,
  mode,
  selfRating,
  onSelfRating,
}: TaskProps & { task: WritingTask }) {
  const text = typeof value === "string" ? value : "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div>
      {task.criteria && mode === "input" && (
        <Criteria criteria={task.criteria} mode="input" />
      )}
      <Hints hints={task.hints} />

      {task.inputMode === "single-line" ? (
        <input
          type="text"
          value={text}
          disabled={mode === "review"}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-12 w-full rounded-lg border-2 border-slate-300 px-3 py-2.5 text-base focus:border-brand-500 disabled:bg-slate-50 sm:text-sm"
          placeholder="Ihre Antwort"
        />
      ) : (
        <>
          <textarea
            value={text}
            rows={8}
            disabled={mode === "review"}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border-2 border-slate-300 px-3 py-2.5 text-base leading-relaxed focus:border-brand-500 disabled:bg-slate-50 sm:text-sm"
            placeholder="Schreiben Sie hier Ihren Text …"
          />
          <p className="mt-1 text-xs text-slate-500">
            {words} Wörter
            {task.minWords ? ` (empfohlen: mindestens ${task.minWords})` : ""}
          </p>
        </>
      )}

      {mode === "review" && (
        <>
          {task.criteria && <Criteria criteria={task.criteria} mode="review" />}
          <Musterloesung
            text={task.musterloesung}
            selfRating={selfRating}
            onSelfRating={onSelfRating}
          />
        </>
      )}
    </div>
  );
}

function Speaking({
  task,
  value,
  onChange,
  mode,
  selfRating,
  onSelfRating,
}: TaskProps & { task: SpeakingTask }) {
  const text = typeof value === "string" ? value : "";

  return (
    <div>
      <Hints hints={task.hints} />
      <textarea
        value={text}
        rows={4}
        disabled={mode === "review"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-2 border-slate-300 px-3 py-2.5 text-base leading-relaxed focus:border-brand-500 disabled:bg-slate-50 sm:text-sm"
        placeholder="Notizen zu Ihrer Antwort (freiwillig) – sprechen Sie zuerst laut."
      />

      {mode === "review" && (
        <Musterloesung
          text={task.musterloesung}
          audioSrc={task.musterAudioSrc}
          selfRating={selfRating}
          onSelfRating={onSelfRating}
        />
      )}
    </div>
  );
}

/**
 * Musterlösung is only ever rendered in review mode. Showing it next to the
 * input would remove any reason to write an answer first.
 */
function Musterloesung({
  text,
  audioSrc,
  selfRating,
  onSelfRating,
}: {
  text: string;
  audioSrc?: string;
  selfRating?: SelfRating;
  onSelfRating?: (rating: SelfRating) => void;
}) {
  const ratings: { value: SelfRating; label: string }[] = [
    { value: "gut", label: "Gut" },
    { value: "teilweise", label: "Teilweise" },
    { value: "nochmal", label: "Noch einmal üben" },
  ];

  return (
    <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
        Musterlösung
      </p>
      <p className="prose-exam text-sm text-slate-800">{text}</p>

      {audioSrc && (
        <audio controls src={audioSrc} className="mt-3 w-full">
          Ihr Browser kann kein Audio abspielen.
        </audio>
      )}

      {onSelfRating && (
        <div className="mt-4 border-t border-brand-200 pt-3">
          <p className="mb-2 text-xs font-medium text-slate-700">
            Vergleichen Sie Ihre Antwort. Wie gut war sie?
          </p>
          <div className="flex flex-wrap gap-2">
            {ratings.map((rating) => (
              <button
                key={rating.value}
                type="button"
                onClick={() => onSelfRating(rating.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selfRating === rating.value
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {rating.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
