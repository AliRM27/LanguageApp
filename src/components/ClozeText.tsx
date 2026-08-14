"use client";

import type { Task } from "@/lib/schema";
import { isCorrect, type AnswerValue } from "@/lib/scoring";

/**
 * A text whose gaps are filled in place.
 *
 * The alternative — markers in the text and a numbered list of questions below
 * it — makes the learner hold a number in their head and look back and forth
 * to see which sentence they are choosing for. The whole point of this task
 * type is that the choice depends on the words either side of the gap, so the
 * choice belongs in the sentence.
 *
 * Gaps are written `___(1)___` in the content; the nth marker takes the nth
 * task, which is why the schema says their order must match.
 */

const MARKER = /___\((\d+)\)___/g;

export function ClozeText({
  text,
  tasks,
  mode,
  answers,
  onChange,
}: {
  text: string;
  tasks: Task[];
  mode: "input" | "review";
  answers: Record<string, AnswerValue>;
  onChange: (taskId: string, value: AnswerValue) => void;
}) {
  // Split into alternating literal text and gap numbers.
  const pieces: Array<{ text: string } | { gap: number }> = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    if (match.index! > last) pieces.push({ text: text.slice(last, match.index) });
    pieces.push({ gap: Number(match[1]) });
    last = match.index! + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });

  return (
    <div className="prose-exam rounded-lg bg-slate-100 p-4 text-sm leading-loose text-slate-800 sm:p-5">
      {pieces.map((piece, i) =>
        "text" in piece ? (
          <span key={i}>{piece.text}</span>
        ) : (
          <Gap
            key={i}
            number={piece.gap}
            task={tasks[piece.gap - 1]}
            mode={mode}
            value={answers[tasks[piece.gap - 1]?.id ?? ""]}
            onChange={(value) => {
              const task = tasks[piece.gap - 1];
              if (task) onChange(task.id, value);
            }}
          />
        ),
      )}
    </div>
  );
}

function Gap({
  number,
  task,
  mode,
  value,
  onChange,
}: {
  number: number;
  task?: Task;
  mode: "input" | "review";
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}) {
  // A marker with no matching task is an authoring mistake; say so rather than
  // rendering an empty control the learner cannot use.
  if (!task || task.type !== "multiple-choice") {
    return (
      <span className="rounded bg-rose-100 px-1 text-rose-800">
        ({number}: keine Aufgabe)
      </span>
    );
  }

  const correct = mode === "review" ? isCorrect(task, value) : undefined;
  const chosen = typeof value === "string" ? value : "";

  const tone =
    correct === true
      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
      : correct === false
        ? "border-rose-400 bg-rose-50 text-rose-900"
        : "border-slate-400 bg-white focus:border-brand-500";

  return (
    <span className="mx-1 inline-flex items-baseline gap-1 align-baseline">
      <span className="text-xs font-semibold text-slate-500">({number})</span>
      <select
        value={chosen}
        disabled={mode === "review"}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Lücke ${number}`}
        // text-base on phones: a smaller font makes iOS zoom the page on focus,
        // and here that would happen in the middle of a sentence.
        className={`min-h-9 rounded-lg border-2 px-2 py-1 text-base font-medium disabled:opacity-100 sm:text-sm ${tone}`}
      >
        <option value="">…</option>
        {task.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.text}
          </option>
        ))}
      </select>
      {correct === false && (
        <span className="text-xs font-semibold text-emerald-700">
          → {task.options.find((o) => o.id === task.solution)?.text}
        </span>
      )}
    </span>
  );
}

/** The explanations, shown under the text once the section is submitted. */
export function ClozeExplanations({ tasks }: { tasks: Task[] }) {
  const withText = tasks.filter(
    (task) => "explanation" in task && task.explanation,
  );
  if (withText.length === 0) return null;

  return (
    <ol className="mt-3 space-y-2">
      {withText.map((task, i) => (
        <li key={task.id} className="flex gap-3 text-sm text-slate-600">
          <span className="shrink-0 font-semibold text-slate-500">
            ({i + 1})
          </span>
          <span>{"explanation" in task ? task.explanation : null}</span>
        </li>
      ))}
    </ol>
  );
}
