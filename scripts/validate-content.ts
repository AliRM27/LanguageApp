/**
 * Validates every test file against the schema and checks the things Zod
 * cannot: duplicate ids, solutions that point at options which do not exist,
 * matching tasks that leave items unsolved.
 *
 * Run with `npm run validate:content` — content is written by hand, so this is
 * the cheapest way to catch mistakes before they reach a learner.
 */
import fs from "node:fs";
import path from "node:path";
import { testSchema, type Test } from "../src/lib/schema";

const ROOT = path.join(process.cwd(), "content", "tests");
const problems: string[] = [];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".json") ? [full] : [];
  });
}

function checkSemantics(test: Test, file: string) {
  const where = (msg: string) => problems.push(`${file}: ${msg}`);
  const taskIds = new Set<string>();

  for (const section of test.sections) {
    for (const part of section.parts) {
      for (const block of part.blocks) {
        // In a Zuordnung each option may be used at most once — that is what
        // makes the surplus options genuine distractors.
        const used = new Map<string, string>();
        for (const task of block.tasks) {
          if (task.type !== "zuordnung") continue;
          const previous = used.get(task.solution);
          if (previous) {
            where(
              `"${task.id}": Option "${task.solution}" ist schon bei "${previous}" die Lösung`,
            );
          }
          used.set(task.solution, task.id);
        }

        for (const task of block.tasks) {
          if (taskIds.has(task.id)) where(`doppelte Aufgaben-ID "${task.id}"`);
          taskIds.add(task.id);

          if (task.type === "luecke") {
            const gaps = task.prompt.match(/_{2,}/g) ?? [];
            if (gaps.length !== 1) {
              where(
                `"${task.id}": the sentence must contain exactly one gap (___), found ${gaps.length}`,
              );
            }
            // A sentence that already contains the answer is unanswerable-proof
            // in the wrong direction: it gives the point away.
            const withoutGap = task.prompt.replace(/_{2,}/, " ").toLowerCase();
            if (withoutGap.includes(task.solution.toLowerCase())) {
              where(`"${task.id}": the sentence gives away "${task.solution}"`);
            }
          }

          if (task.type === "multiple-choice") {
            if (!task.options.some((o) => o.id === task.solution)) {
              where(`"${task.id}": Lösung "${task.solution}" ist keine Option`);
            }
          }

          // A zuordnung task takes its options from the enclosing block, so
          // this cross-reference is exactly what Zod alone cannot check.
          if (task.type === "zuordnung") {
            if (!block.optionPool) {
              where(`"${task.id}": Block "${block.id}" hat keinen optionPool`);
            } else if (!block.optionPool.some((o) => o.id === task.solution)) {
              where(
                `"${task.id}": Lösung "${task.solution}" ist nicht im optionPool`,
              );
            }
          }
        }
      }
    }
  }

  const kinds = test.sections.map((s) => s.kind);
  if (new Set(kinds).size !== kinds.length) where("doppelter Prüfungsteil");
}

const files = walk(ROOT);
const ids = new Set<string>();

for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    problems.push(`${rel}: ungültiges JSON – ${(error as Error).message}`);
    continue;
  }

  const parsed = testSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push(`${rel}: ${issue.path.join(".")} – ${issue.message}`);
    }
    continue;
  }

  if (ids.has(parsed.data.id)) problems.push(`${rel}: doppelte Test-ID`);
  ids.add(parsed.data.id);

  checkSemantics(parsed.data, rel);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} Problem(e) gefunden:\n`);
  for (const problem of problems) console.error(`  · ${problem}`);
  process.exit(1);
}

console.log(`${files.length} Testdatei(en) geprüft – alles in Ordnung.`);
