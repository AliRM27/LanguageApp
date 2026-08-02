#!/usr/bin/env node
/**
 * Pre-flight checks for going live.
 *
 * Everything here is something that is easy to forget and embarrassing (or
 * expensive) in public: an unfilled Impressum, a link to a page that does not
 * exist, a test whose audio file was never generated.
 *
 * Dependency-free on purpose — it has to run before `npm install` has
 * necessarily worked, and in CI, and on a laptop with no network.
 *
 *   node scripts/check-release.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const problems = [];
const warnings = [];

const fail = (what, detail) => problems.push({ what, detail });
const warn = (what, detail) => warnings.push({ what, detail });

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

function walk(dir, filter) {
  const out = [];
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, filter));
    else if (filter(entry.name)) out.push(rel);
  }
  return out;
}

/* ------------------------------ 1. Impressum ------------------------------ */

const siteConfig = read("src/lib/site.ts");
const todos = [...siteConfig.matchAll(/TODO\("([^"]+)"\)/g)].map((m) => m[1]);
const requiredTodos = todos.filter(
  (hint) => !/USt|Telefon/i.test(hint), // vatId and phone are genuinely optional
);
if (requiredTodos.length > 0) {
  fail(
    "Impressum incomplete",
    `src/lib/site.ts still has placeholders: ${requiredTodos.join(", ")}.\n` +
      "    A German Impressum (§ 5 DDG) is mandatory as soon as the site is public.",
  );
}

/* --------------------------- 2. Placeholder text -------------------------- */

for (const file of walk("src", (n) => n.endsWith(".tsx") || n.endsWith(".ts"))) {
  const text = read(file);
  if (/Noch auszufüllen|juristisch zu prüfen|\[Vorname Nachname\]/.test(text)) {
    fail("Placeholder text still on a page", file);
  }
  if (/Row Level Security/.test(text)) {
    fail(
      "Stale claim about Row Level Security",
      `${file} — that was Supabase; access is now scoped server-side by session.`,
    );
  }
}

/* ------------------------------- 3. Routes -------------------------------- */

// Every directory under src/app holding a page.tsx is a route.
const routes = new Set(
  walk("src/app", (n) => n === "page.tsx").map((p) => {
    const url = path
      .dirname(p)
      .replace(/^src\/app/, "")
      .replace(/\/\([^/]+\)/g, ""); // route groups do not appear in the URL
    return url === "" ? "/" : url;
  }),
);

const isDynamic = (route) => route.includes("[");
const staticRoutes = new Set([...routes].filter((r) => !isDynamic(r)));
const dynamicPatterns = [...routes]
  .filter(isDynamic)
  .map((r) => new RegExp("^" + r.replace(/\[[^\]]+\]/g, "[^/]+") + "$"));

const knownFiles = new Set(["/sitemap.xml", "/robots.txt"]);

for (const file of walk("src", (n) => n.endsWith(".tsx"))) {
  const text = read(file);
  for (const match of text.matchAll(/href="(\/[^"?#]*)/g)) {
    const href = match[1].replace(/\/$/, "") || "/";
    if (knownFiles.has(href) || href.startsWith("/api/")) continue;
    if (staticRoutes.has(href)) continue;
    if (dynamicPatterns.some((re) => re.test(href))) continue;
    fail("Link to a route that does not exist", `${file} -> ${href}`);
  }
}

/* -------------------------------- 4. Audio -------------------------------- */

let audioReferenced = 0;
let audioMissing = 0;
for (const file of walk("content/tests", (n) => n.endsWith(".json"))) {
  const test = JSON.parse(read(file));
  for (const section of test.sections ?? []) {
    for (const part of section.parts ?? []) {
      const src = part.audio?.src;
      if (!src) continue;
      audioReferenced++;
      if (!exists(path.join("public", src))) {
        audioMissing++;
        fail("Audio file missing", `${test.id} · ${part.id} -> public${src}`);
      }
    }
  }
}

/* ------------------------------ 5. Launch bits ---------------------------- */

for (const f of [
  "src/app/icon.png",
  "src/app/opengraph-image.png",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "src/app/error.tsx",
  "src/app/not-found.tsx",
]) {
  if (!exists(f)) fail("Missing launch file", f);
}

/* -------------------------------- 6. Env ---------------------------------- */

if (!process.env.NEXT_PUBLIC_SITE_URL) {
  warn(
    "NEXT_PUBLIC_SITE_URL is not set here",
    "Fine locally. On Vercel it must be the real https:// domain, or the links\n" +
      "    inside confirmation e-mails will point at the wrong host.",
  );
}
if (!process.env.MONGODB_URI) {
  warn("MONGODB_URI is not set here", "Accounts are switched off without it.");
}

/* -------------------------------- report ---------------------------------- */

const line = (i, { what, detail }) => `  ${i}. ${what}\n     ${detail}`;

console.log("");
console.log(`Routes found:      ${routes.size}`);
console.log(`Audio referenced:  ${audioReferenced} (${audioMissing} missing)`);
console.log("");

if (warnings.length) {
  console.log("Warnings");
  warnings.forEach((w, i) => console.log(line(i + 1, w)));
  console.log("");
}

if (problems.length === 0) {
  console.log("Ready to deploy.\n");
  process.exit(0);
}

console.log(`Not ready — ${problems.length} problem(s):`);
problems.forEach((p, i) => console.log(line(i + 1, p)));
console.log("");
process.exit(1);
