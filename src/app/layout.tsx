import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthSync } from "@/components/AuthSync";
import { Analytics } from "@/components/Analytics";
import { site, siteUrl } from "@/lib/site";

const DESCRIPTION =
  "Kostenlose Übungstests für die Deutschprüfung: Hören, Lesen, Schreiben und Sprechen – mit Lösungen, Erklärungen und Musterlösungen.";

/**
 * `metadataBase` is what makes the social image work. Without it Next emits a
 * relative og:image URL, and every scraper — WhatsApp above all, which is how
 * a class actually shares a link — silently shows no preview at all.
 *
 * The image itself is src/app/opengraph-image.png; Next picks it up by
 * filename, so it needs no wiring here.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Deutsch Test Online – Prüfungsvorbereitung",
    template: "%s · Deutsch Test Online",
  },
  description: DESCRIPTION,
  applicationName: site.name,
  // No `alternates` and no `openGraph.url` here on purpose. Next merges
  // metadata shallowly, so anything set in this layout is inherited by every
  // page that does not override it — a canonical here would mark all 18 tests
  // as duplicates of the homepage. Each page declares its own via `canonical()`.
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: site.name,
    title: "Deutsch Test Online – Prüfungsvorbereitung",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Deutsch Test Online – Prüfungsvorbereitung",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="flex min-h-screen flex-col">
        <AuthSync />
        <SiteHeader />
        {/*
          The column stays at max-w-3xl on purpose. More air was wanted, but a
          wider column would lengthen the reading lines — and this app is partly
          a *reading* exam, where long measures genuinely hurt comprehension.
          The openness comes from vertical rhythm and padding instead.
        */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-6 sm:py-16">
          {children}
        </main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
