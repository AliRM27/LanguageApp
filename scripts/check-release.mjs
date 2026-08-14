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

/**
 * A draft is a test still being written. Its audio and images are allowed to
 * be missing, because they usually are — the content gets reviewed first and
 * recorded afterwards. Drafts are also left out of the production build, so
 * nothing incomplete can reach a learner either way.
 */
let audioReferenced = 0;
let audioMissing = 0;
let imagesMissing = 0;
const drafts = [];

for (const file of walk("content/tests", (n) => n.endsWith(".json"))) {
  const test = JSON.parse(read(file));
  const report = test.draft ? warn : fail;
  if (test.draft) drafts.push(test.id);

  for (const section of test.sections ?? []) {
    for (const part of section.parts ?? []) {
      const src = part.audio?.src;
      if (src) {
        audioReferenced++;
        if (!exists(path.join("public", src))) {
          audioMissing++;
          report("Audio file missing", `${test.id} · ${part.id} -> public${src}`);
        }
      }
      for (const block of part.blocks ?? []) {
        for (const stimulus of block.stimuli ?? []) {
          const image = stimulus.image?.src;
          if (!image) continue;
          if (!exists(path.join("public", image))) {
            imagesMissing++;
            report("Image missing", `${test.id} · ${part.id} -> public${image}`);
          }
        }
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

/**
 * On a build server this is not a warning, it is a broken deploy: the sitemap,
 * robots.txt, canonical tags and og:image are all generated at build time, so
 * an unset value ships a site that quietly claims to live on localhost.
 */
const onBuildServer = Boolean(process.env.VERCEL || process.env.CI);
const siteUrlVar = process.env.NEXT_PUBLIC_SITE_URL;

if (!siteUrlVar) {
  (onBuildServer ? fail : warn)(
    "NEXT_PUBLIC_SITE_URL is not set",
    onBuildServer
      ? "Set it to https://deutschtestonline.de in the Vercel project settings."
      : "Fine locally — the build will use http://localhost:3000 for the sitemap,\n" +
        "    canonical tags and og:image. It must be the real domain on Vercel.",
  );
} else if (onBuildServer && /localhost|127\.0\.0\.1/.test(siteUrlVar)) {
  fail(
    "NEXT_PUBLIC_SITE_URL points at localhost on a build server",
    `Currently "${siteUrlVar}". Every confirmation link would send learners to\n` +
      "    their own machine. Set it to https://deutschtestonline.de.",
  );
} else if (!siteUrlVar.startsWith("https://") && onBuildServer) {
  fail(
    "NEXT_PUBLIC_SITE_URL is not an https:// address",
    `Currently "${siteUrlVar}".`,
  );
} else if (siteUrlVar.endsWith("/")) {
  fail(
    "NEXT_PUBLIC_SITE_URL ends with a slash",
    `"${siteUrlVar}" would produce doubled slashes in e-mail links.`,
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
if (imagesMissing) console.log(`Images missing:    ${imagesMissing}`);
if (drafts.length) {
  console.log(`Drafts (not published): ${drafts.join(", ")}`);
}
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
