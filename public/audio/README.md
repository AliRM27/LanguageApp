# Audio

The mp3 files under this folder are generated from the `transcript` fields in
`content/tests/**`. Nothing here is written by hand.

```bash
npm run audio:plan     # 1. build audio/plan.json — free, offline, no API key
npm run audio:check    # 2. what is missing, what is still unconfigured
npm run audio:build    # 3. synthesise into public/audio/
```

Requires `ffmpeg` on your PATH and an API key in the environment.

## Step 1 — plan

`audio/plan.json` says, for every recording, who speaks each line, which voice
slot they get and how long the pause after them is. It is worth reading before
spending anything, because it is where mistakes are visible:

- **Speaker names are resolved.** The transcripts call the same person "Katrin
  Sommer" and later just "Sommer"; the planner merges them so the interviewee
  does not change voice halfway through.
- **A monologue can span several lines.** Inside one block, a line without a
  `Name:` label continues whoever spoke last, so a report about five people
  reads naturally instead of repeating the speaker's name every sentence.
- **Announcements are not speakers.** Lines like `Achtung: …` or
  `Der Wetterbericht: …` are read by the narrator, not by a character.
- **No two people in one recording share a voice.** The planner fails loudly if
  that would happen — in a listening exam it is the difference between a fair
  task and an impossible one.
- **Pauses follow exam items, not lines.** Turns in a dialogue are 0.55 s apart;
  between two Gespräche it is 1.8 s, so the learner can answer.
- **Speed follows the level**: A1 is synthesised at 0.88, A2 at 0.94.
- **Numbers to write down are dictated, not spoken.** Any run of four or more
  digits — a phone number, an order number, a flight number — is split out of
  its sentence and each *group* becomes its own recording at 0.78 of the level
  rate, with 320 ms of silence between the groups and a longer pause either
  side:

  ```
  "Bitte notieren Sie:"   0341 · 55 · 88 · 22   "Die alte Nummer gilt…"
  ```

  Slowing the number as one utterance is not enough — the groups still run into
  each other and the learner has no moment to write. Following a fast sentence
  and taking dictation are different tasks.

  **The grouping is whatever the transcript uses.** "0341 55 88 22" is dictated
  in four parts, "X 7 3 9 2" digit by digit, "504 – 982" in two. Writing the
  spacing is how you control the rhythm — so group a number the way the answer
  is written.

  Times and prices are left alone: "um 19 Uhr" and "65 Euro" are short enough to
  catch, and slowing them would make those items trivial. This applies at every
  level automatically, so new content is covered without anyone remembering.

If it reports that it cannot tell someone's gender, or you want a different
voice for a character, set it in `scripts/audio/voices.json` under `speakers`
and re-run the plan.

## Step 2 — voices

The plan only refers to abstract slots (`narrator`, `female-1`, `male-2`, …).
`scripts/audio/voices.json` maps those to real voices of one provider. Switching
provider is that one file — the plan never changes.

Fill `voiceMap` from your provider's own voice list, and choose voices that are
clearly distinguishable: the point of separate slots is that a learner can tell
two speakers apart.

## Step 3 — synthesise

Each segment is cached under `audio/.cache/` keyed by its text, voice and rate.
Correcting one sentence in a transcript therefore re-synthesises one sentence,
not 54 files. This matters — the transcripts will be corrected many times.

`audio/manifest.json` records which version of the script each mp3 was built
from, so `npm run audio:check` can tell you what is **stale** — built from a
transcript or a voice that has since changed — rather than only what is
missing. `npm run audio:build` rebuilds exactly those. Without it, correcting a
transcript would silently leave the old recording in place.

Output is mono, 24 kHz, 64 kbit/s, loudness-normalised to −16 LUFS so learners
do not have to reach for the volume between tests. That is roughly 450 KB per
file, about 25 MB for all 54.

`npm run audio:build` skips files that already exist; add `--force` to rebuild,
or `--only uebungstest-a2-03` to do a single test.

## Cost

All 54 files are about 38,000 characters of speech.

| Voice tier | Price | Cost for a full rebuild |
|---|---|---|
| Standard / WaveNet | $4 / 1M | a few cents, inside the free monthly tier |
| Neural2 | $16 / 1M | ~$0.60 |
| Chirp 3: HD | $30 / 1M | ~$1.15 |
| Studio | $160 / 1M | ~$6 if used everywhere |

The current `voiceMap` uses Chirp 3: HD for the characters and Studio for the
narrator, which comes to about **$3.10 per full rebuild**. Note that the
narrator carries 15,019 of the 38,248 characters — the A1 Hören Teil 2 files are
pure announcements — so the narrator voice, not the character voices, is what
drives that number. Moving the narrator to Chirp 3: HD would bring a rebuild
under $1.

The number that matters is not the first run but the tenth, after your mother
has corrected the transcripts a few times.

## Provider notes

- **Google Neural2 / Studio / WaveNet** apply `speakingRate` themselves.
- **Google Chirp 3: HD voices ignore `speakingRate` entirely.** Asking for 0.88
  silently returns full-speed audio — for an A1 listening test, the opposite of
  what is wanted. The script detects this and slows those voices with ffmpeg's
  `atempo` after synthesis instead (atempo preserves pitch, so the voice does
  not go deep). Nothing to configure; it just needs to stay true that the check
  in `supportsRate()` matches the voices in `voiceMap`.
- **ElevenLabs** has no rate parameter at all, so it takes the same path.

Because of this, the rate is only part of the cache key when the API baked it
in. For Chirp 3 voices the raw recording is cached once and re-tempoed, so
changing a level's speed later costs nothing.
- **`offline-test`** generates a tone per line instead of speech. It needs no
  key and no network, and exists only to check timing and the player. Never
  ship those files to learners.
