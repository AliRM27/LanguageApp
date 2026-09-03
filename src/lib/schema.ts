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

/**
 * Ein Prüfungsteil.
 *
 * Bis B1 ist das schlicht eine der vier Fertigkeiten. Die berufsbezogenen
 * B2-Prüfungen kombinieren dagegen zwei davon in einem Teil mit eigener Zeit:
 * Man liest eine Kundenmail und antwortet darauf, man hört eine Nachricht und
 * schreibt eine Notiz. Das ist keine Verwaltungsfrage – die Kombination *ist*
 * die Aufgabe, und sie hat eine eigene Uhr.
 */
export const sectionKindSchema = z.enum([
  "hoeren",
  "lesen",
  "schreiben",
  "sprechen",
  "lesen-schreiben",
  "hoeren-schreiben",
  "sprachbausteine",
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
  /** Small label above the text, e.g. "Anzeige c". */
  title: z.string().optional(),
  /**
   * The text's own headline, set in bold — the name of a shop in an advert,
   * the subject line of a letter. Separate from `title` because one is our
   * label for the item and the other belongs to the item itself.
   */
  heading: z.string().optional(),
  /** Plain text; newlines are preserved when rendered. */
  text: z.string().min(1),
  /**
   * A picture the learner talks about — Sprechen Teil 2 is a Bildbeschreibung,
   * so the picture *is* the task.
   *
   * `alt` is not decoration here. It describes the scene well enough for the
   * task to still make sense to someone using a screen reader, and it is what
   * the page shows while the file is missing, so a new test can be reviewed
   * before anyone has sourced a photograph.
   */
  image: z
    .object({
      src: z.string().min(1),
      alt: z.string().min(1),
    })
    .optional(),
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
  /**
   * Print the option pool as a visible a–f list above the questions.
   *
   * Needed when the options are sentences that exist nowhere else — B1 Hören
   * Teil 4, where the learner matches three spoken opinions against six printed
   * statements. Without it those statements are only reachable by opening each
   * dropdown one at a time, which is not how the exam presents them.
   *
   * Off by default because in A1/A2 Lesen the options *are* the adverts already
   * shown as stimuli, and repeating them as a list would only add noise.
   */
  showOptionList: z.boolean().optional(),
  /**
   * Render the block's first stimulus as a cloze: the gaps written `___(1)___`
   * in the text become dropdowns in place, and the tasks are not listed
   * separately underneath.
   *
   * This is how a "Wörter ergänzen" task actually looks on paper — the reader
   * needs the sentence around the gap to choose, and pairing a numbered list
   * below with markers above forces them to hold the number in their head while
   * looking back and forth.
   *
   * The nth marker uses the nth task, so their order must match.
   */
  inlineGaps: z.boolean().optional(),
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
  /**
   * Still being written. Draft tests are visible while developing and hidden
   * from the live site, and the release checks do not insist that their audio
   * and images exist yet.
   *
   * Without this, one unfinished test blocks the deploy of every finished one —
   * which in practice means either shipping half a test or not shipping the
   * improvements to the others.
   */
  draft: z.boolean().optional(),
  /**
   * Fertigstellungsgrad, wenn ein Test nicht einfach fertig ist.
   *
   *   (nicht gesetzt)  fertig – normal nutzbar
   *   "in-arbeit"      auf der Website sichtbar, aber gekennzeichnet und nicht
   *                    startbar. Für Inhalte, die es schon gibt, denen aber noch
   *                    etwas fehlt – etwa die Tonaufnahmen.
   *   "entwurf"        gar nicht veröffentlicht (siehe `draft`, gleichbedeutend)
   *
   * Der Unterschied zu `draft` ist der Punkt: Ein Entwurf existiert für die
   * Lernenden nicht. „In Arbeit“ existiert und sagt, dass er kommt – das ist
   * eine Ankündigung, keine Sperre.
   */
  status: z.enum(["in-arbeit", "entwurf"]).optional(),
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
  B2: "Deutsch für den Beruf: Unterweisungen und Protokolle verstehen, mit Kundschaft schreiben und die eigene Meinung begründen.",
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
  "lesen-schreiben": "Lesen und Schreiben",
  "hoeren-schreiben": "Hören und Schreiben",
  sprachbausteine: "Sprachbausteine und Schreiben",
};

export function allTasks(section: Section): Task[] {
  return section.parts.flatMap((part) =>
    part.blocks.flatMap((block) => block.tasks),
  );
}
