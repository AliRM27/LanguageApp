# Architecture

## The shape of the problem

Because Schreiben and Sprechen are checked by the learner against a
Musterlösung rather than by a grader, and because Hören/Lesen have fixed answer
keys, this is a **content-delivery app**, not a backend app. There is no AI at
runtime, no grading service, and no database in the request path.

That single observation drives every decision below.

```
   content (git)                          runtime (Supabase, optional)
   content/tests/**/*.json                auth.users
   public/audio/**                        attempts
          │                                      ▲
          │ build time                           │ client-side, per user
          ▼                                      │
   Zod validation ──► Next.js SSG ──► static pages
```

## Decisions

**Content in git, not in a database.** Tests are structured data written by
hand and reviewed by a teacher. Git gives versioning, diffs and review for
free, and lets every test page be statically generated. A CMS would add a
schema to maintain in two places and a service to keep running, for a corpus
that changes a few times a month.

**One Zod schema as the single source of truth.** `src/lib/schema.ts` defines
the content model and TypeScript types are inferred from it, so content and
code cannot drift. Content is validated at build time and by
`npm run validate:content`. This is the piece that is expensive to get wrong;
everything else is cheap to change.

**Tasks are a discriminated union.** Five types today. Adding an exam format
means one new union member and one new renderer — no changes to scoring, the
runner, results, or storage. This is what makes IELTS or a new level additive
rather than a rewrite.

**A part is a sequence of blocks, not a list of texts followed by a list of
questions.** A block is one text plus the questions about it. Reading parts
genuinely work this way — e-mail, its questions, next e-mail, its questions —
and a flat part cannot express that ordering. Parts with a single text, or none
at all, are just parts with one block.

**Every matched situation is its own task.** A Zuordnung with five situations is
five tasks worth five points, not one task worth one. The shared list of adverts
lives on the block as `optionPool`, so adding an advert is a single edit rather
than one per situation. This is the one place where a task is not fully
self-contained, and the content validator checks the cross-reference.

**Auto-scored and self-assessed types are structurally distinct.** A task has
either a `solution` or a `musterloesung`, never both. Scoring code can
therefore never accidentally "grade" a writing task, and the content validator
enforces the rule.

**Supabase for progress only, never for content.** Test pages don't touch it,
so an outage or a missing key can't stop anyone from practising. The app runs
fully without Supabase configured; the login UI simply disappears.

**Local-first progress.** Answers are written to `localStorage` synchronously
and pushed to Supabase debounced. Language learners are often on poor mobile
connections; losing twenty minutes of writing to a dropped request would be the
worst possible failure.

**Answers as one jsonb blob, not a row per answer.** Task types will keep
evolving. A normalised answers table would need a migration for each new one,
and there is no query that needs to filter across individual answers.

**Magic-link auth.** No passwords stored, no reset flow to build, and one less
thing for an A1-level user to get wrong in a language they're still learning.

**Timer counts up and never blocks.** This is an Übungstest. A hard cut-off
would punish a beginner for looking up a word. The recommended exam time is
shown for orientation; a strict mode can be a flag later.

**Musterlösung is hidden until submission.** Rendering it next to the input
removes any reason to write an answer first. It is only mounted in review mode.

**German-only UI, German URLs.** Immersion-consistent, and `/uebungstest/...`
is what the audience would search for.

**Levels are separate pages, not one long list.** `/uebungstests` shows the
levels, `/uebungstests/a1` and `/uebungstests/a2` the tests within one. A flat
list of 18 (later 45) tests would force a learner to filter mentally on every
visit, and a level page is also the natural landing page for a search like
"A2 Übungstest". Adding B1 means adding content — the level pages are generated
from whatever levels have tests.

## Test structures

**A1** — 41 tasks, 30 scored automatically.

| Section | Parts | Tasks |
|---|---|---|
| Hören | MC easy / richtig-falsch / MC harder | 5 + 5 + 5 |
| Lesen | 2 e-mails / 8 Anzeigen / 5 Schilder | 2+3, 5, 5 |
| Schreiben | Formular / E-Mail (3 Leitpunkte) | 5 + 1 |
| Sprechen | Vorstellen / Informationen / Bitten | 1 + 2 + 2 |

**A2** — 40 tasks, 30 scored automatically.
Empfohlene Zeiten: Hören 30, Lesen 25, Schreiben 25, Sprechen 15 Minuten.

| Section | Parts | Tasks |
|---|---|---|
| Hören | Notizen ergänzen (Lücken) / Radiosendung MC / Zuordnung | 5 + 5 + 5 |
| Lesen | ein Zeitungstext / 8 Anzeigen / 5 Schilder | 5 + 5 + 5 |
| Schreiben | Formular / E-Mail (4 Leitpunkte) | 5 + 1 |
| Sprechen | Vorstellen / Alltagsgespräch / Zusammen planen | 1 + 2 + 1 |

Nine tests exist at each level, each with its own theme so vocabulary does not
repeat across a level.

In both levels Hören and Lesen are scored automatically; Schreiben and Sprechen
are self-assessed against a Musterlösung.

The A2 Hören Zuordnung reuses the same machinery as the A1 Anzeigen matching:
five prompts, one shared question on the block, eight options in the pool, three
of them deliberately unused. The validator enforces that no option is the
solution twice — otherwise the surplus options stop being real distractors.

## Layout

```
content/tests/<lang>/<level>/<id>.json   test content
public/audio/...                         TTS output, referenced by content
src/lib/schema.ts                        Zod schema + inferred types
src/lib/content.ts                       build-time loader
src/lib/scoring.ts                       answer shapes, correctness, scores
src/lib/attempt-store.ts                 local-first progress hook
src/lib/supabase/                        optional client + server clients
src/components/TaskRenderer.tsx          one renderer per task type
src/components/SectionRunner.tsx         working through a section
src/components/ResultsView.tsx           overall results
src/app/                                 routes
supabase/migrations/                     attempts table + RLS
scripts/validate-content.ts              content linter
```

## Deliberately not in v1

Payments, an admin UI, AI grading, recording of spoken answers, IELTS content,
strict exam timing. None of them require changing the model above — they are
additive.

## Known next steps

1. Generate the Hören audio and drop it into `public/audio/`.
2. Have a native speaker review the A1 content — AI-generated material tends to
   drift above the target level, which is the main quality risk.
3. Fill in `/impressum` and `/datenschutz` before going public.
4. Only then: more tests, then A2.
