/**
 * Turns every `audio.transcript` in the content into a synthesis plan:
 * who says which line, with which voice, and how long the pause after it is.
 *
 *   node scripts/audio/plan-audio.mjs            # write audio/plan.json
 *   node scripts/audio/plan-audio.mjs --check    # only report problems
 *
 * The plan is written before anything is synthesised so it can be reviewed —
 * and corrected via scripts/audio/voices.json — without spending API quota.
 * Synthesis itself is a separate step that consumes this file.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content", "tests");
const OUT_DIR = path.join(ROOT, "audio");
const OVERRIDES = path.join(ROOT, "scripts", "audio", "voices.json");

/* --------------------------------- voices --------------------------------- */

/**
 * Abstract voice slots, not provider voice ids.
 *
 * The planner decides *that* two people need different voices; which actual
 * voice a slot maps to lives in scripts/audio/voices.json. That keeps the plan
 * independent of the TTS provider — switching from Google to ElevenLabs is one
 * file, not a re-plan.
 *
 * Two speakers in the same recording must never share a slot: in a listening
 * exam that is the difference between a fair task and an impossible one.
 */
const SLOTS = {
  f: ["female-1", "female-2", "female-3", "female-4"],
  m: ["male-1", "male-2", "male-3", "male-4"],
};
/** Announcements, scene descriptions and "Gespräch 1" headers. */
const NARRATOR = "narrator";

/** Slower for beginners; the player also offers a "Langsam" button. */
const RATE = { A1: 0.88, A2: 0.94, B1: 1.0, B2: 1.0, C1: 1.0 };

/**
 * Numbers that have to be written down — phone numbers, order numbers,
 * insurance numbers, flight numbers — are spoken more slowly than the sentence
 * around them, with a short pause on either side.
 *
 * A learner can follow a fast sentence and still miss "0341 55 88 22", because
 * dictation is a different task from comprehension. Times and prices are left
 * alone: "um 19 Uhr" and "65 Euro" are short enough to catch at normal speed.
 */
const DICTATION_RATE = 0.78;
const PAUSE_BEFORE_NUMBER_MS = 350;
const PAUSE_AFTER_NUMBER_MS = 450;
/**
 * Silence between the groups of a number.
 *
 * Slowing "0341 55 88 22" as one utterance does not help: the groups still run
 * into each other and the learner has no moment to write. A person dictating a
 * number pauses between the groups, so the synthesiser does too — each group is
 * a separate recording with silence after it.
 *
 * The grouping is whatever the transcript uses: "0341 55 88 22" is dictated in
 * four parts, "X 7 3 9 2" digit by digit. Writing the spacing is how the author
 * controls the rhythm.
 */
const PAUSE_BETWEEN_NUMBER_GROUPS_MS = 320;
/**
 * At least four digits, optionally prefixed by a short code like "LH" or "A".
 * The separator class includes the en dash, because "5 0 4 – 9 8 2" is written
 * with one and would otherwise be read as two short, fast numbers.
 */
const DICTATION_SPAN = /\b(?:[A-Za-zÄÖÜ]{1,3}\s*)?\d[\d\s\-–—./]{2,}\d\b/g;
const MIN_DICTATION_DIGITS = 4;

/** Turn-taking inside a conversation. */
const PAUSE_TURN_MS = 550;
/** Between two exam items — the learner needs time to read and answer. */
const PAUSE_BETWEEN_ITEMS_MS = 1800;
/** After "Gespräch 3", before the item itself starts. */
const PAUSE_AFTER_HEADER_MS = 900;
/** Two announcements in a row without a header between them. */
const PAUSE_BETWEEN_ANNOUNCEMENTS_MS = 1400;
const PAUSE_AT_END_MS = 300;

/* ------------------------------ speaker names ----------------------------- */

const FEMALE_WORDS =
  /(^Frau\b|Moderatorin|Verkäuferin|Ärztin|Lehrerin|Kollegin|Schülerin|Apothekerin|Mitarbeiterin|Nachbarin|Chefin|Sprechstundenhilfe|Kellnerin|Rezeptionistin|Praktikantin|Beraterin)/;
const MALE_WORDS =
  /(^Herr\b|Moderator$|Verkäufer$|Arzt$|Lehrer$|Kollege$|Schüler$|Apotheker$|Mitarbeiter$|Nachbar$|Chef$|Kellner$|Rezeptionist$|Techniker|Hausmeister|Patient$|Postbote|Berater$)/;

/**
 * The learners are people who have moved to Germany, so the characters in the
 * tests are too. Names common in their communities belong in these lists as
 * much as German ones — otherwise every new test stops the planner with a
 * "cannot tell the gender" warning and needs a manual override.
 *
 * Note the matcher strips everything outside a-z and äöüß, so a name has to be
 * listed in the form that survives that: "Ayşe" arrives here as "ayse".
 */
const FEMALE_NAMES = new Set([
  "amara","amina","amira","ana","andrea","anke","anna","aylin","ayse",
  "bettina","bianca","christine","clara","dilara","elena","elif","erika",
  "esra","eszter","fatima","fatou","giulia","grace","hatice","heike","ines",
  "irina","ivana","julia","kateryna","katrin","kerstin","lena","leyla",
  "linh","lisa","maria","marie","marion","marta","merve","miriam","nadia",
  "nadine","nasrin","nina","nuray","oksana","olena","olga","petra","renate",
  "rosa","sabine","samira","sandra","sara","silke","sofia","ute","yuki",
  "zeynep",
]);
const MALE_NAMES = new Set([
  "adem","ahmad","ali","amir","andrii","bekim","ben","carlos","dawid",
  "dragan","emre","ergün","georg","hakan","hassan","ibrahim","ismail",
  "jonas","kerem","kwame","lukas","marco","marek","martin","max","mehmet",
  "milan","murat","niklas","oleh","omar","paul","pawel","pedro","peter",
  "rafael","sami","samir","serkan","stefan","thomas","timo","tobias","tom",
  "tomasz","tuan","viktor","yusuf",
]);

/** Lines that introduce an item rather than being spoken by a character. */
const HEADER_RE =
  /^(Gespräch|Nachricht|Meldung|Mitteilung|Ansage|Aussage|Situation|Durchsage|Text|Teil|Aufgabe)\s*\d+/i;

/** "Frau Bauer: ..." — a colon-led speaker label, not a sentence with a colon. */
const SPEAKER_RE = /^([A-ZÄÖÜ][\wÄÖÜäöüß.\- ]{0,28}?):\s+(.*)$/;

/**
 * Announcements also start with a capital and a colon — "Achtung: …",
 * "Der Wetterbericht: …", "Bitte beachten Sie: …". They are read by the
 * narrator, not by a character, so they must not become speakers.
 */
const DETERMINERS = new Set(["Der", "Die", "Das", "Ein", "Eine", "Unser", "Unsere"]);
const ANNOUNCEMENT_WORDS = new Set([
  "Achtung", "Hinweis", "Information", "Durchsage", "Ansage", "Wetterbericht",
  "Bitte", "Liebe", "Lieber", "Sehr",
]);

function isSpeakerLabel(label) {
  const tokens = label.split(/\s+/);
  if (tokens.length > 3) return false;
  if (DETERMINERS.has(tokens[0]) || ANNOUNCEMENT_WORDS.has(tokens[0])) return false;
  // "Bitte beachten Sie" / "Information für unsere Gäste": a lower-case word
  // after the first means this is a sentence, not a name.
  return tokens
    .slice(1)
    .every((t) => /^[A-ZÄÖÜ]/.test(t) || /^(Dr\.|von|van)$/.test(t));
}

function guessGender(label) {
  // "Kursleiterin", "Teamleiterin", "Hausmeisterin": the -erin ending is a
  // reliable feminine marker and does not collide with names like "Martin".
  if (/erin$/.test(label)) return "f";
  if (FEMALE_WORDS.test(label)) return "f";
  if (MALE_WORDS.test(label)) return "m";
  if (/^Frau$/.test(label)) return "f";
  if (/^Mann$/.test(label)) return "m";

  for (const word of label.split(/\s+/)) {
    const w = word.toLowerCase().replace(/[^a-zäöüß]/g, "");
    if (FEMALE_NAMES.has(w)) return "f";
    if (MALE_NAMES.has(w)) return "m";
  }
  return null;
}

/**
 * "Katrin Sommer" and "Sommer" are the same person. Within one recording, a
 * short label that is the first or last word of a longer one is merged into it.
 */
function resolveAliases(labels) {
  const canonical = new Map();
  const sorted = [...labels].sort((a, b) => b.length - a.length);

  for (const label of sorted) {
    let target = label;
    for (const longer of sorted) {
      if (longer === label) continue;
      const parts = longer.split(/\s+/);
      if (parts.includes(label) && longer.length > label.length) {
        target = canonical.get(longer) ?? longer;
        break;
      }
    }
    canonical.set(label, target);
  }
  return canonical;
}

/* -------------------------------- planning -------------------------------- */

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.name.endsWith(".json") ? [full] : [];
  });
}

function parseTranscript(transcript) {
  const blocks = transcript.split(/\n\s*\n/);
  const segments = [];

  blocks.forEach((block, blockIndex) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    // Within a block, a line with no label continues whoever spoke last, so a
    // monologue can be written as several readable lines under one name
    // instead of repeating "Lena:" in front of every sentence.
    let lastSpeaker = null;

    lines.forEach((line) => {
      let kind = "announcement";
      let speaker = null;
      let text = line;

      if (HEADER_RE.test(line)) {
        kind = "header";
        lastSpeaker = null;
      } else {
        const m = line.match(SPEAKER_RE);
        if (m && isSpeakerLabel(m[1].trim())) {
          kind = "speech";
          speaker = m[1].trim();
          text = m[2].trim();
          lastSpeaker = speaker;
        } else if (lastSpeaker) {
          kind = "speech";
          speaker = lastSpeaker;
        }
      }

      segments.push({ kind, speaker, text, blockIndex });
    });
  });

  // A transcript separates every turn with a blank line, so block boundaries
  // alone would put a long pause after each line of a dialogue. The pause
  // belongs between exam *items*, not between turns.
  segments.forEach((segment, i) => {
    const next = segments[i + 1];

    if (!next) segment.pauseAfterMs = PAUSE_AT_END_MS;
    else if (segment.kind === "header") segment.pauseAfterMs = PAUSE_AFTER_HEADER_MS;
    else if (next.kind === "header") segment.pauseAfterMs = PAUSE_BETWEEN_ITEMS_MS;
    else if (
      next.blockIndex !== segment.blockIndex &&
      next.kind === "announcement"
    )
      segment.pauseAfterMs = PAUSE_BETWEEN_ANNOUNCEMENTS_MS;
    else segment.pauseAfterMs = PAUSE_TURN_MS;
  });

  return splitDictationSpans(segments).map(({ blockIndex, ...rest }) => rest);
}

/**
 * "0341 55 88 22" -> ["0341", "55", "88", "22"]
 * "A 12 34 56 78" -> ["A 12", "34", "56", "78"]
 *
 * A leading letter code stays attached to the first group: read alone, a bare
 * "A" is easy to mishear as a word.
 */
function numberGroups(span) {
  const groups = span.split(/[\s\-–—./]+/).filter(Boolean);
  if (groups.length > 1 && /^[A-Za-zÄÖÜ]{1,3}$/.test(groups[0])) {
    return [`${groups[0]} ${groups[1]}`, ...groups.slice(2)];
  }
  return groups;
}

/**
 * Splits a segment around any number that must be written down, so the number
 * can be synthesised more slowly and group by group.
 */
function splitDictationSpans(segments) {
  const out = [];

  for (const segment of segments) {
    const matches = [...segment.text.matchAll(DICTATION_SPAN)].filter(
      (m) => (m[0].match(/\d/g) ?? []).length >= MIN_DICTATION_DIGITS,
    );

    if (matches.length === 0) {
      out.push(segment);
      continue;
    }

    const pieces = [];
    let cursor = 0;

    for (const match of matches) {
      // After the first split the remainder starts with the punctuation that
      // followed the number — ". Ich wiederhole:". Reading that stray full stop
      // aloud sounds like a stumble.
      const before = segment.text
        .slice(cursor, match.index)
        .replace(/^[\s.,;:!?–—-]+/, "")
        .trim();
      if (before) {
        pieces.push({ text: before, pauseAfterMs: PAUSE_BEFORE_NUMBER_MS });
      }
      const groups = numberGroups(match[0].trim());
      groups.forEach((group, i) => {
        pieces.push({
          text: group,
          slow: true,
          pauseAfterMs:
            i === groups.length - 1
              ? PAUSE_AFTER_NUMBER_MS
              : PAUSE_BETWEEN_NUMBER_GROUPS_MS,
        });
      });
      cursor = match.index + match[0].length;
    }

    // The sentence continues after the number, so it starts with the leftover
    // punctuation of the split — "…22" + ". Die alte Nummer…". Reading that
    // stray full stop aloud sounds like a stumble.
    const rest = segment.text
      .slice(cursor)
      .replace(/^[\s.,;:!?–—-]+/, "")
      .trim();
    if (rest) pieces.push({ text: rest, pauseAfterMs: PAUSE_TURN_MS });

    // The original pause belongs after the last piece, not in the middle.
    pieces[pieces.length - 1].pauseAfterMs = segment.pauseAfterMs;

    for (const piece of pieces) {
      out.push({
        ...segment,
        text: piece.text,
        slow: piece.slow ?? false,
        pauseAfterMs: piece.pauseAfterMs,
      });
    }
  }

  return out;
}

const overrides = fs.existsSync(OVERRIDES)
  ? JSON.parse(fs.readFileSync(OVERRIDES, "utf8"))
  : {};

const plan = [];
const warnings = [];

for (const file of walk(CONTENT).sort()) {
  const test = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const section of test.sections) {
    for (const part of section.parts) {
      if (!part.audio) continue;

      const segments = parseTranscript(part.audio.transcript);

      // One voice per person, per recording.
      const labels = new Set(
        segments.filter((s) => s.speaker).map((s) => s.speaker),
      );
      const canonical = resolveAliases(labels);
      const people = [...new Set([...canonical.values()])].sort();

      const fileOverrides = overrides.speakers?.[test.id]?.[part.id] ?? {};
      const used = { f: 0, m: 0 };
      const voiceOf = {};

      for (const person of people) {
        if (fileOverrides[person]) {
          voiceOf[person] = fileOverrides[person];
          continue;
        }
        const gender = guessGender(person);
        if (!gender) {
          warnings.push(
            `${test.id}/${part.id}: cannot tell the gender of "${person}" — set a slot in scripts/audio/voices.json`,
          );
          voiceOf[person] = SLOTS.f[used.f++ % SLOTS.f.length];
          continue;
        }
        const pool = SLOTS[gender];
        if (used[gender] >= pool.length) {
          warnings.push(
            `${test.id}/${part.id}: more than ${pool.length} speakers of the same gender — add another slot`,
          );
        }
        voiceOf[person] = pool[used[gender]++ % pool.length];
      }

      // Two people sharing a voice makes the task unfair — report it.
      const byVoice = {};
      for (const [person, voice] of Object.entries(voiceOf)) {
        (byVoice[voice] ??= []).push(person);
      }
      for (const [voice, persons] of Object.entries(byVoice)) {
        if (persons.length > 1) {
          warnings.push(
            `${test.id}/${part.id}: ${persons.join(" and ")} would share the slot ${voice} — add an override`,
          );
        }
      }

      plan.push({
        testId: test.id,
        partId: part.id,
        level: test.level,
        language: test.language,
        output: part.audio.src,
        rate: RATE[test.level] ?? 1.0,
        speakers: voiceOf,
        segments: segments.map((s) => ({
          ...s,
          speaker: s.speaker ? canonical.get(s.speaker) : null,
          slot: s.speaker ? voiceOf[canonical.get(s.speaker)] : NARRATOR,
          // A number to be written down is slower than the sentence it sits in.
          rate: s.slow
            ? Math.round((RATE[test.level] ?? 1) * DICTATION_RATE * 100) / 100
            : (RATE[test.level] ?? 1),
        })),
      });
    }
  }
}

const totalChars = plan.reduce(
  (sum, f) => sum + f.segments.reduce((s, seg) => s + seg.text.length, 0),
  0,
);

if (!process.argv.includes("--check")) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "plan.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), files: plan }, null, 2) + "\n",
  );
  console.log(`Wrote audio/plan.json — ${plan.length} files, ${totalChars.toLocaleString()} characters.`);
}

const speechSegments = plan.reduce(
  (n, f) => n + f.segments.filter((s) => s.kind === "speech").length,
  0,
);
console.log(`Segments: ${plan.reduce((n, f) => n + f.segments.length, 0)} total, ${speechSegments} spoken by a named person.`);

if (warnings.length) {
  console.error(`\n${warnings.length} thing(s) to check:`);
  for (const w of warnings) console.error("  · " + w);
  process.exit(1);
}
console.log("No voice conflicts.");
