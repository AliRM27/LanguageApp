import {
  allTasks,
  isAutoScored,
  type GapTask,
  type Section,
  type Task,
  type Test,
} from "./schema";

/**
 * Answer value shapes, by task type:
 *   multiple-choice  -> string    (option id)
 *   richtig-falsch   -> boolean
 *   zuordnung        -> string    (option id from the block's optionPool)
 *   luecke           -> string    (what the learner typed)
 *   schreiben        -> string    (the user's text)
 *   sprechen         -> string    (optional notes)
 */
export type AnswerValue = string | boolean | undefined;
export type Answers = Record<string, AnswerValue>;

/** Self-rating for the sections that have no automatic scoring. */
export type SelfRating = "gut" | "teilweise" | "nochmal";
export type SelfAssessment = Record<string, SelfRating>;

export function isAnswered(_task: Task, value: AnswerValue): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/* ------------------------------ gap answers ------------------------------- */

/** Function words a learner may or may not type in front of the answer. */
const LEADING_WORDS = new Set([
  "am",
  "um",
  "ab",
  "im",
  "in",
  "an",
  "der",
  "die",
  "das",
  "den",
  "dem",
]);

/**
 * Makes gap answers comparable without being unfair.
 *
 * A learner who hears "0341 55 88 22" may write it with or without spaces;
 * one who hears "um halb neun" may write "8:30" or "8.30 Uhr" or "am Freitag"
 * instead of "Freitag". None of that is a listening mistake, so none of it is
 * marked wrong. Genuine alternatives (ausgeschriebene Uhrzeiten, abbreviated
 * weekdays) belong in the task's `acceptedAnswers`.
 */
export function normalizeGapAnswer(value: string): string {
  let s = value.trim().toLowerCase();

  // 20.15 / 20,15 -> 20:15  (only between digits, so "3. Oktober" is safe)
  s = s.replace(/(\d)[.,](\d)/g, "$1:$2");

  // The unit is never the point of the exercise.
  s = s.replace(/\buhr\b/g, " ");

  // Punctuation out, but ":" and "-" stay (times, dates, ranges).
  s = s.replace(/[.,;!?()"'„“”»«]/g, " ");

  s = s.replace(/\s+/g, " ").trim();

  // "am Freitag" and "Freitag" are the same answer.
  let parts = s.split(" ");
  while (parts.length > 1 && LEADING_WORDS.has(parts[0])) parts = parts.slice(1);

  return parts.join(" ");
}

const digitsOf = (s: string) => s.replace(/\D/g, "");
const hasLetters = (s: string) => /[a-zäöüß]/.test(s);

function gapIsCorrect(task: GapTask, value: AnswerValue): boolean {
  if (typeof value !== "string" || !value.trim()) return false;

  const given = normalizeGapAnswer(value);
  const candidates = [task.solution, ...(task.acceptedAnswers ?? [])].map(
    normalizeGapAnswer,
  );

  if (candidates.includes(given)) return true;

  // For purely numeric answers (phone numbers, platforms, times) spacing is
  // irrelevant. Not applied when the answer contains words, or "3. Oktober"
  // would match "3. November".
  const givenDigits = digitsOf(given);
  if (!givenDigits) return false;

  return candidates.some(
    (candidate) =>
      !hasLetters(candidate) && digitsOf(candidate) === givenDigits,
  );
}

/** `undefined` for task types that are not automatically scored. */
export function isCorrect(task: Task, value: AnswerValue): boolean | undefined {
  switch (task.type) {
    case "multiple-choice":
    case "zuordnung":
    case "richtig-falsch":
      return value === task.solution;
    case "luecke":
      return gapIsCorrect(task, value);
    default:
      return undefined;
  }
}

export interface SectionScore {
  /** Number of auto-scored tasks answered correctly. */
  correct: number;
  /** Total number of auto-scored tasks. */
  total: number;
  /** Tasks that need self-assessment against a Musterlösung. */
  selfAssessedTotal: number;
  /** How many of the section's tasks have any answer at all. */
  answered: number;
  taskCount: number;
  percent: number | null;
}

export function scoreSection(section: Section, answers: Answers): SectionScore {
  const tasks = allTasks(section);
  let correct = 0;
  let total = 0;
  let selfAssessedTotal = 0;
  let answered = 0;

  for (const task of tasks) {
    const value = answers[task.id];
    if (isAnswered(task, value)) answered += 1;
    if (isAutoScored(task)) {
      total += 1;
      if (isCorrect(task, value)) correct += 1;
    } else {
      selfAssessedTotal += 1;
    }
  }

  return {
    correct,
    total,
    selfAssessedTotal,
    answered,
    taskCount: tasks.length,
    percent: total > 0 ? Math.round((correct / total) * 100) : null,
  };
}

export function scoreTest(test: Test, answers: Answers) {
  const sections = test.sections.map((section) => ({
    kind: section.kind,
    title: section.title,
    score: scoreSection(section, answers),
  }));

  const correct = sections.reduce((sum, s) => sum + s.score.correct, 0);
  const total = sections.reduce((sum, s) => sum + s.score.total, 0);

  return {
    sections,
    correct,
    total,
    percent: total > 0 ? Math.round((correct / total) * 100) : null,
  };
}

/** TELC practice tests are commonly passed at 60%. Shown as guidance only. */
export const PASS_THRESHOLD_PERCENT = 60;
