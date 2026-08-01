import fs from "node:fs";
import path from "node:path";
import {
  levelSchema,
  testSchema,
  type Level,
  type SectionKind,
  type Test,
} from "./schema";

/**
 * Loads test content from /content at build time.
 *
 * Content lives in git as JSON, not in a database: tests are versioned,
 * reviewable, and every test page can be statically generated.
 */

const CONTENT_ROOT = path.join(process.cwd(), "content", "tests");

function readTestFiles(): string[] {
  if (!fs.existsSync(CONTENT_ROOT)) return [];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) files.push(full);
    }
  };
  walk(CONTENT_ROOT);
  return files.sort();
}

let cache: Test[] | null = null;

export function getAllTests(): Test[] {
  if (cache) return cache;
  cache = readTestFiles().map((file) => {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const parsed = testSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid test content in ${path.relative(process.cwd(), file)}:\n` +
          JSON.stringify(parsed.error.format(), null, 2),
      );
    }
    return parsed.data;
  });
  return cache;
}

export function getTest(testId: string): Test | undefined {
  return getAllTests().find((test) => test.id === testId);
}

export function getSection(testId: string, kind: string) {
  const test = getTest(testId);
  if (!test) return undefined;
  const section = test.sections.find((s) => s.kind === kind);
  if (!section) return undefined;
  return { test, section };
}

/* --------------------------------- levels --------------------------------- */

// `levelSlug`, `parseLevelSlug` and `LEVEL_DESCRIPTION` live in schema.ts
// because they contain no filesystem access and client components need them.
export { levelSlug, parseLevelSlug, LEVEL_DESCRIPTION } from "./schema";

export function getTestsByLevel(level: Level): Test[] {
  return getAllTests().filter((test) => test.level === level);
}

/** Levels that actually have content, in CEFR order. */
export function getLevels(): { level: Level; count: number }[] {
  return levelSchema.options
    .map((level) => ({ level, count: getTestsByLevel(level).length }))
    .filter((entry) => entry.count > 0);
}

export function nextSectionKind(
  test: Test,
  current: SectionKind,
): SectionKind | undefined {
  const index = test.sections.findIndex((s) => s.kind === current);
  return test.sections[index + 1]?.kind;
}
