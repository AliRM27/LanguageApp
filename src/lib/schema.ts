import { z } from "zod";

/**
 * Content schema for practice tests.
 *
 * This is the single source of truth for test content. Everything else in the
 * app — renderers, scoring, results — is derived from these types.
 *
 * Design rules:
 *  - A new task type = one new member of `taskSchema` + one renderer component.
 *  - A new exam language (e.g. IELTS/English) = new content files, no code change.
 *  - Auto-scorable task types expose a `solution`; self-assessed ones expose a
 *    `musterloesung` instead. Nothing has both.
 */

export const levelSchema = z.enum(["A1", "A2", "B1", "B2", "C1"]);
export type Level = z.infer<typeof levelSchema>;

export const examLanguageSchema = z.enum(["de", "en"]);
export type ExamLanguage = z.infer<typeof examLanguageSchema>;

export const sectionKindSchema = z.enum([
  "hoeren",
  "lesen",
  "schreiben",
  "sprechen",
]);
export type SectionKind = z.infer<typeof sectionKindSchema>;

/* -------------------------------------------------------------------------- */
/*                                   Tasks                                    */
/* -------------------------------------------------------------------------- */

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

/** Multiple choice, exactly one correct option. Auto-scored. */
export const multipleChoiceTaskSchema = z.object({
  type: z.literal("multiple-choice"),
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(optionSchema).min(2),
  solution: z.string().min(1),
  explanation: z.string().optional(),
});

/** Richtig / Falsch. Auto-scored. */
export const trueFalseTaskSchema = z.object({
  type: z.literal("richtig-falsch"),
  id: z.string().min(1),
  statement: z.string().min(1),
  solution: z.boolean(),
  explanation: z.string().optional(),
});

/**
 * One situation to be matched against a shared list of adverts. Auto-scored.
 *
 * The candidate options are NOT stored on the task: they live on the enclosing
 * block as `optionPool`, because several situations share the same list of
 * Anzeigen. Keeping them here would mean repeating eight options five times and
 * having to edit five places to add one advert.
 */
export const matchingTaskSchema = z.object({
  type: z.literal("zuordnung"),
  id: z.string().min(1),
  prompt: z.string().min(1),
  /** An option id from the block's `optionPool`. */
  solution: z.string().min(1),
  explanation: z.string().optional(),
});

/**
 * Gap in a note or form: the learner writes what they heard or read.
 * Auto-scored, but tolerantly — see `normalizeGapAnswer` in scoring.ts.
 */
export const GAP_MARKER = /_{2,}/;

export const gapTaskSchema = z.object({
  type: z.literal("luecke"),
  id: z.string().min(1),
  /**
   * A complete sentence with the gap marked by `___`, for example:
   *   "Der Techniker kommt am ___ zwischen 9 und 12 Uhr."
   *
   * The sentence around the gap is what tells the learner how much to write.
   * A bare label ("Der Techniker kommt am:") leaves them guessing between
   * "Dienstag" and "Dienstag zwischen 9 und 12 Uhr", and there is no fair way
   * to mark that.
   */
  prompt: z.string().min(1).regex(GAP_MARKER, {
    message: "the sentence must contain a gap written as ___",
  }),
  /** The answer as it would ideally be written. */
  solution: z.string().min(1),
  /**
   * Further spellings that also count. Normalisation already handles case,
   * spacing and punctuation, so this is for genuine alternatives
   * ("Do." for "Donnerstag", "halb neun" for "8:30").
   */
  acceptedAnswers: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

/** Free written text. Not auto-scored — compared against a Musterlösung. */
export const writingTaskSchema = z.object({
  type: z.literal("schreiben"),
  id: z.string().min(1),
  prompt: z.string().min(1),
  /**
   * Leitpunkte — the content points the answer must cover. Shown while
   * writing (as in the real exam) and again as a self-check afterwards.
   */
  criteria: z.array(z.string()).optional(),
  hints: z.array(z.string()).optional(),
  minWords: z.number().int().positive().optional(),
  /** Short single-line answer (e.g. a form field) vs. multi-line text. */
  inputMode: z.enum(["single-line", "multi-line"]).default("multi-line"),
  musterloesung: z.string().min(1),
});

/** Spoken answer. Not auto-scored — compared against a Musterlösung. */
export const speakingTaskSchema = z.object({
  type: z.literal("sprechen"),
  id: z.string().min(1),
  prompt: z.string().min(1),
  hints: z.array(z.string()).optional(),
  musterloesung: z.string().min(1),
  /** Optional recorded example answer. */
  musterAudioSrc: z.string().optional(),
});

export const taskSchema = z.discriminatedUnion("type", [
  multipleChoiceTaskSchema,
  trueFalseTaskSchema,
  matchingTaskSchema,
  gapTaskSchema,
  writingTaskSchema,
  speakingTaskSchema,
]);

export type Task = z.infer<typeof taskSchema>;
export type TaskType = Task["type"];
export type MultipleChoiceTask = z.infer<typeof multipleChoiceTaskSchema>;
export type TrueFalseTask = z.infer<typeof trueFalseTaskSchema>;
export type MatchingTask = z.infer<typeof matchingTaskSchema>;
export type GapTask = z.infer<typeof gapTaskSchema>;
export type WritingTask = z.infer<typeof writingTaskSchema>;
export type SpeakingTask = z.infer<typeof speakingTaskSchema>;

/** Task types that produce a score. */
export const AUTO_SCORED_TYPES = [
  "multiple-choice",
  "richtig-falsch",
  "zuordnung",
  "luecke",
] as const satisfies readonly TaskType[];

export function isAutoScored(task: Task): boolean {
  return (AUTO_SCORED_TYPES as readonly string[]).includes(task.type);
}

/* -------------------------------------------------------------------------- */
/*                              Parts & sections                              */
/* -------------------------------------------------------------------------- */

export const audioSchema = z.object({
  src: z.string().min(1),
  /** Shown after submission, and as a fallback if the file is missing. */
  transcript: z.string().min(1),
});

/** Reading passage, advertisement, sign, note, etc. */
export const stimulusSchema = z.object({
  title: z.string().optional(),
  /** Plain text; newlines are preserved when rendered. */
  text: z.string().min(1),
});

/**
 * A text together with the questions about it.
 *
 * This is what makes reading parts work the way the exam does: an e-mail, then
 * its two questions, then the next e-mail, then its three questions. A part
 * that shows one text (or none at all, as in Hören) is simply a part with a
 * single block.
 */
export const blockSchema = z.object({
  id: z.string().min(1),
  /**
   * One question that applies to every task in the block, e.g.
   * "Wo findet man diese Person?" above a list of five people.
   */
  prompt: z.string().optional(),
  stimuli: z.array(stimulusSchema).optional(),
  /** Shared answer options for the `zuordnung` tasks in this block. */
  optionPool: z.array(optionSchema).min(2).optional(),
  tasks: z.array(taskSchema).min(1),
});
export type Block = z.infer<typeof blockSchema>;

export const partSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().min(1),
  audio: audioSchema.optional(),
  blocks: z.array(blockSchema).min(1),
});
export type Part = z.infer<typeof partSchema>;

export const sectionSchema = z.object({
  kind: sectionKindSchema,
  title: z.string().min(1),
  /** Recommended time. Displayed, not enforced. */
  durationMinutes: z.number().int().positive(),
  description: z.string().min(1),
  parts: z.array(partSchema).min(1),
});
export type Section = z.infer<typeof sectionSchema>;

export const testSchema = z.object({
  id: z.string().min(1),
  language: examLanguageSchema,
  level: levelSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
});
export type Test = z.infer<typeof testSchema>;

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/** URL segment for a level: "A2" -> "a2". */
export const levelSlug = (level: Level) => level.toLowerCase();

export function parseLevelSlug(slug: string): Level | undefined {
  const parsed = levelSchema.safeParse(slug.toUpperCase());
  return parsed.success ? parsed.data : undefined;
}

export const LEVEL_DESCRIPTION: Record<Level, string> = {
  A1: "Erste Schritte: sich vorstellen, einkaufen, nach dem Weg fragen und einfache Formulare ausfüllen.",
  A2: "Alltag bewältigen: über Arbeit, Wohnen und Gesundheit sprechen, Notizen machen und kurze E-Mails schreiben.",
  B1: "Selbstständig im Alltag und im Beruf: Meinungen begründen und zusammenhängend erzählen.",
  B2: "Sicher in Beruf und Studium: komplexere Texte verstehen und differenziert argumentieren.",
  C1: "Fließend und präzise: anspruchsvolle Texte verstehen und sich spontan ausdrücken.",
};

export const SECTION_ORDER: SectionKind[] = [
  "hoeren",
  "lesen",
  "schreiben",
  "sprechen",
];

export const SECTION_LABEL: Record<SectionKind, string> = {
  hoeren: "Hören",
  lesen: "Lesen",
  schreiben: "Schreiben",
  sprechen: "Sprechen",
};

export function allTasks(section: Section): Task[] {
  return section.parts.flatMap((part) =>
    part.blocks.flatMap((block) => block.tasks),
  );
}
