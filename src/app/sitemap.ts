import type { MetadataRoute } from "next";
import { getAllTests, getLevels, levelSlug } from "@/lib/content";
import { siteUrl } from "@/lib/site";

/**
 * The sitemap, generated from the content files.
 *
 * Adding a test to /content puts it in here automatically — there is no list to
 * remember to update, which is the only way a sitemap stays true.
 *
 * Left out on purpose: the result pages (nothing to index until someone has
 * answered something), and everything behind or about signing in. Those also
 * carry `robots: noindex` on the page itself, so the two agree.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const tests = getAllTests();

  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/uebungstests`,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // One page per level — the natural landing page for "Deutsch A1 üben".
    ...getLevels().map(({ level }) => ({
      url: `${base}/uebungstests/${levelSlug(level)}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),

    // The overview of each test: the most useful thing to rank.
    ...tests.map((test) => ({
      url: `${base}/uebungstest/${test.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),

    // Each part, so "Hörverstehen A2 Übung" can find the actual exercise.
    ...tests.flatMap((test) =>
      test.sections.map((section) => ({
        url: `${base}/uebungstest/${test.id}/${section.kind}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ),
  ];
}
