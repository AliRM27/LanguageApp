/**
 * Turns audio/plan.json into the mp3 files under public/audio/.
 *
 *   node scripts/audio/plan-audio.mjs                 # 1. plan (free, offline)
 *   node scripts/audio/synthesize.mjs --check         # 2. what is missing?
 *   node scripts/audio/synthesize.mjs                 # 3. synthesise
 *   node scripts/audio/synthesize.mjs --only uebungstest-a1-01
 *
 * Every segment is cached by a hash of its text, voice and rate, so correcting
 * one sentence in a transcript re-synthesises one sentence — not 54 files. That
 * matters because the transcripts will be corrected many times.
 *
 * Needs ffmpeg on PATH and an API key in the environment:
 *   GOOGLE_TTS_API_KEY=...    (provider "google")
 *   ELEVENLABS_API_KEY=...    (provider "elevenlabs")
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import "dotenv/config";

const ROOT = process.cwd();
const PLAN = path.join(ROOT, "audio", "plan.json");
const VOICES = path.join(ROOT, "scripts", "audio", "voices.json");
const CACHE = path.join(ROOT, "audio", ".cache");
const PUBLIC = path.join(ROOT, "public");

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check");
const FORCE = args.includes("--force");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
// Record existing files as up to date without rebuilding them. Needed once,
// for audio that was generated before the manifest existed.
const ACCEPT = args.includes("--accept");

/* ------------------------------- providers -------------------------------- */

/**
 * Can the provider slow this voice down itself?
 *
 * Google's Chirp 3: HD voices ignore `speakingRate` — asking for 0.88 silently
 * returns full-speed audio, which for an A1 listening test is exactly the wrong
 * outcome. Where the API cannot do it, ffmpeg's `atempo` does it afterwards;
 * atempo preserves pitch, so the voice does not go deep.
 */
export function supportsRate(provider, voice) {
  if (provider === "google") return !/chirp/i.test(voice);
  if (provider === "offline-test") return true;
  return false; // ElevenLabs has no rate parameter at all.
}

const providers = {
  /** https://texttospeech.googleapis.com */
  async google({ text, voice, rate, languageCode }) {
    const key = process.env.GOOGLE_TTS_API_KEY;
    if (!key) throw new Error("GOOGLE_TTS_API_KEY is not set");

    const audioConfig = { audioEncoding: "MP3" };
    // Sending an unsupported field is at best ignored, at worst an error.
    if (supportsRate("google", voice)) audioConfig.speakingRate = rate;

    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode, name: voice },
          audioConfig,
        }),
      },
    );
    if (!res.ok)
      throw new Error(`Google TTS ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return { buffer: Buffer.from(json.audioContent, "base64") };
  },

  /**
   * No network, no speech: a tone per segment, roughly as long as the line
   * would take to say. Only for checking timing, pauses and the player —
   * never ship these files to learners.
   */
  async "offline-test"({ text }) {
    const seconds = Math.max(0.6, text.length / 14);
    const file = path.join(os.tmpdir(), `tone-${crypto.randomUUID()}.mp3`);
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=320:duration=${seconds.toFixed(2)}`,
      "-ar",
      "24000",
      "-ac",
      "1",
      file,
    ]);
    const buffer = fs.readFileSync(file);
    fs.rmSync(file, { force: true });
    return { buffer };
  },

  /** https://api.elevenlabs.io — no speaking rate, so ffmpeg slows it down. */
  async elevenlabs({ text, voice }) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY is not set");

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );
    if (!res.ok)
      throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    return { buffer: Buffer.from(await res.arrayBuffer()) };
  },
};

/* --------------------------------- ffmpeg --------------------------------- */

const ff = (args) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

/** Everything is normalised to the same wav format before concatenation. */
function toWav(inputFile, outputFile, { atempo } = {}) {
  const filters = ["aresample=24000", "aformat=channel_layouts=mono"];
  if (atempo && atempo !== 1) filters.unshift(`atempo=${atempo}`);
  ff([
    "-i",
    inputFile,
    "-af",
    filters.join(","),
    "-ar",
    "24000",
    "-ac",
    "1",
    outputFile,
  ]);
}

function silenceWav(ms, outputFile) {
  ff([
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=mono:sample_rate=24000",
    "-t",
    (ms / 1000).toFixed(3),
    outputFile,
  ]);
}

/* ---------------------------------- run ----------------------------------- */

if (!fs.existsSync(PLAN)) {
  console.error(
    "audio/plan.json is missing — run scripts/audio/plan-audio.mjs first.",
  );
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
const config = JSON.parse(fs.readFileSync(VOICES, "utf8"));
const files = ONLY ? plan.files.filter((f) => f.testId === ONLY) : plan.files;

/**
 * Which built file corresponds to which version of the script.
 *
 * Without this, correcting a transcript leaves a stale mp3 on disk and nothing
 * says so — the app would keep playing the old recording. The manifest makes
 * "what do I need to regenerate?" answerable by the tool instead of by memory.
 */
const MANIFEST = path.join(ROOT, "audio", "manifest.json");
const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
  : {};

const fingerprint = (file) =>
  crypto
    .createHash("sha1")
    .update(
      JSON.stringify({
        rate: file.rate,
        voices: Object.fromEntries(
          Object.entries(file.speakers).map(([person, slot]) => [
            person,
            config.voiceMap?.[slot] ?? slot,
          ]),
        ),
        narrator: config.voiceMap?.narrator ?? "narrator",
        // The rate is only part of the fingerprint when a segment deviates from
        // the file rate. Otherwise adding the field would mark every existing
        // recording stale for no audible difference.
        segments: file.segments.map((s) =>
          s.rate !== undefined && s.rate !== file.rate
            ? [s.slot, s.text, s.pauseAfterMs, s.rate]
            : [s.slot, s.text, s.pauseAfterMs],
        ),
      }),
    )
    .digest("hex");

/** "missing" — never built. "stale" — built from an older script or voice. */
function statusOf(file) {
  if (!fs.existsSync(path.join(PUBLIC, file.output))) return "missing";
  return manifest[file.output] === fingerprint(file) ? "current" : "stale";
}

if (ACCEPT) {
  let n = 0;
  for (const file of files) {
    if (!fs.existsSync(path.join(PUBLIC, file.output))) continue;
    manifest[file.output] = fingerprint(file);
    n++;
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Marked ${n} existing file(s) as up to date. Nothing was synthesised.`);
  process.exit(0);
}

/* --check: report state without touching the network. */
if (CHECK_ONLY) {
  const counts = { missing: 0, stale: 0, current: 0 };
  for (const file of files) {
    const status = statusOf(file);
    counts[status]++;
    if (status !== "current") console.log(status.padEnd(8) + " " + file.output);
  }
  const unmapped = Object.entries(config.voiceMap ?? {})
    .filter(([, v]) => !v)
    .map(([slot]) => slot);
  console.log(
    `\n${counts.current} current, ${counts.stale} stale, ${counts.missing} missing (of ${files.length}).`,
  );
  if (counts.stale) {
    console.log("Run \u0060npm run audio:build\u0060 to rebuild the stale ones.");
  }
  if (unmapped.length) {
    console.log(
      `voiceMap still empty for: ${unmapped.join(", ")} — fill scripts/audio/voices.json before synthesising.`,
    );
  }
  process.exit(0);
}

const synth = providers[config.provider];
if (!synth) {
  console.error(
    `Unknown provider "${config.provider}". Use one of: ${Object.keys(providers).join(", ")}`,
  );
  process.exit(1);
}

const unmapped = Object.entries(config.voiceMap ?? {}).filter(([, v]) => !v);
if (unmapped.length) {
  console.error(
    `Fill these slots in scripts/audio/voices.json first: ${unmapped.map(([s]) => s).join(", ")}`,
  );
  process.exit(1);
}

fs.mkdirSync(CACHE, { recursive: true });
// Scratch stays outside the repo: only the segment cache is worth keeping.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uebungstest-audio-"));

let synthesised = 0;
let cached = 0;

for (const file of files) {
  const out = path.join(PUBLIC, file.output);
  if (statusOf(file) === "current" && !FORCE) {
    console.log("skip     " + file.output + "  (up to date)");
    continue;
  }

  const pieces = [];

  for (const [i, segment] of file.segments.entries()) {
    const voice = config.voiceMap[segment.slot];
    const apiDoesRate = supportsRate(config.provider, voice);

    // The rate only belongs in the cache key when the API baked it in.
    // Otherwise the same recording can be re-tempoed for free, so changing a
    // level's speed later costs nothing.
    const key = crypto
      .createHash("sha1")
      .update(
        [
          config.provider,
          voice,
          apiDoesRate ? (segment.rate ?? file.rate) : "raw",
          segment.text,
        ].join("|"),
      )
      .digest("hex");
    const cacheFile = path.join(CACHE, `${key}.mp3`);

    if (!fs.existsSync(cacheFile)) {
      const { buffer } = await synth({
        text: segment.text,
        voice,
        rate: segment.rate ?? file.rate,
        languageCode: config.languageCode ?? "de-DE",
      });
      fs.writeFileSync(cacheFile, buffer);
      synthesised++;
    } else {
      cached++;
    }

    const wav = path.join(tmp, `${String(i).padStart(3, "0")}-a.wav`);
    toWav(cacheFile, wav, {
      atempo: apiDoesRate ? 1 : (segment.rate ?? file.rate),
    });
    pieces.push(wav);

    if (segment.pauseAfterMs > 0) {
      const gap = path.join(tmp, `${String(i).padStart(3, "0")}-b.wav`);
      silenceWav(segment.pauseAfterMs, gap);
      pieces.push(gap);
    }
  }

  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, pieces.map((p) => `file '${p}'`).join("\n"));

  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    // Even loudness across files: learners should not reach for the volume.
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    "-ar",
    "24000",
    "-ac",
    "1",
    out,
  ]);

  manifest[file.output] = fingerprint(file);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

  for (const p of pieces) fs.rmSync(p, { force: true });
  console.log("built    " + file.output);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(
  `\nDone. ${synthesised} segment(s) synthesised, ${cached} reused from cache.`,
);
