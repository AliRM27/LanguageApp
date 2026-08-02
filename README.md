# Deutsch Test Online

Web app with practice tests for German language exams (A1–C1), in the format of
the well-known exams but with entirely original content.

Version 1 ships one complete A1 test with all four sections: Hören, Lesen,
Schreiben, Sprechen.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional, see "Accounts" below
npm run dev                  # http://localhost:3000
```

Everything works without any configuration. Progress is stored in the browser
until Supabase is connected.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (statically generates every test page) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run validate:content` | Validates every test JSON file against the schema |

Run `npm run validate:content` after editing content — it catches missing
Musterlösungen, duplicate task ids, and solutions that point at options which
do not exist.

## How content works

Tests live in `content/tests/<language>/<level>/<id>.json` and are validated
against `src/lib/schema.ts` at build time. There is no CMS and no database for
content: tests are versioned in git, reviewable in a pull request, and every
test page is statically generated.

A test is `Test → Section[] → Part[] → Block[] → Task[]`.

A **block** is a text together with the questions about it. That is what lets a
reading part run e-mail → its two questions → next e-mail → its three
questions, instead of showing every text first and every question after. A part
with one text, or none at all (Hören), is simply a part with a single block.

Six task types exist:

| Type | Scoring |
|---|---|
| `multiple-choice` | automatic |
| `richtig-falsch` | automatic |
| `zuordnung` (matching) | automatic |
| `luecke` (gap in a note or form) | automatic, tolerant — see below |
| `schreiben` | none — shows a `musterloesung` after submission |
| `sprechen` | none — shows a `musterloesung` after submission |

A `luecke` prompt is a **complete sentence with the gap written as `___`**:

```
"Der Techniker kommt am ___ zwischen 9 und 12 Uhr."
```

The sentence around the gap is what tells the learner how much to write. A bare
label ("Der Techniker kommt am:") leaves them choosing between "Dienstag" and
"Dienstag zwischen 9 und 12 Uhr", and there is no fair way to mark that. The
validator enforces exactly one gap per sentence and rejects a sentence that
already contains its own answer.

`luecke` answers are compared after normalisation: case, spacing, punctuation,
a leading "am/um/ab/…" and a trailing "Uhr" are all ignored, and purely numeric
answers (phone numbers, platforms, times) are compared digit by digit. Real
alternatives — `Fr.` for `Freitag`, `03.10.` for `3. Oktober` — go in the task's
`acceptedAnswers`. Answers containing words are never matched on digits alone,
so `3. November` can't pass as `3. Oktober`.

`zuordnung` tasks are one situation each, so every situation gets its own
number and its own point. The list of Anzeigen they choose from lives on the
block as `optionPool`, not on the task — otherwise eight adverts would be
repeated in five places and adding one would mean five edits.

Adding a task type means adding one member to the union in `schema.ts` and one
renderer in `src/components/TaskRenderer.tsx`. Adding a new level or a new
language means adding JSON files — no code changes.

### Adding a test

1. Copy `content/tests/de/a1/uebungstest-a1-01.json`.
2. Change `id` (must be unique — it becomes the URL) and the content.
3. `npm run validate:content`.

The Musterlösung is deliberately never rendered before a section is submitted.

## Audio

The Hören section expects files at the `audio.src` paths under `public/`, e.g.
`public/audio/de/a1/uebungstest-a1-01/hoeren-teil-1.mp3`. They are generated
separately with a text-to-speech service from the `transcript` field in the
same JSON file — see `public/audio/README.md`.

Missing audio degrades gracefully: the player shows a notice, the tasks stay
usable, and the transcript appears after submission.

## Accounts

Our own auth, in this app — no third-party auth service. The API lives in
`src/app/api`, the server code in `src/server`, and the data in MongoDB.

Optional: without `MONGODB_URI` the login disappears and progress stays in
`localStorage`. Every test works either way.

One form at `/anmelden` both signs in and signs up — the server works out which
it is. Passwords are hashed with scrypt, sessions are revocable random tokens
stored hashed, and e-mail links are single-use and expire in an hour. A learner
can only ever reach their own data, and deletion is self-service. Work done
before signing up moves into the account on first sign-in.

**Setup, testing and the security decisions: [docs/accounts.md](docs/accounts.md)**

## Deployment

Vercel, zero config. Set the same environment variables in the project settings
and point `NEXT_PUBLIC_SITE_URL` at the production domain.

## Legal

The exam *format* (CEFR levels, section types, task types) is a methodology and
not protected by copyright. Trademarks like telc are, so the app must never
suggest an official affiliation. The footer carries a disclaimer, the wording
throughout is "in einem Format, das den bekannten Sprachprüfungen ähnlich ist",
and no exam provider's logo or name appears in the product name.

`/impressum` and `/datenschutz` are placeholders and must be completed before
the site goes public in Germany.
