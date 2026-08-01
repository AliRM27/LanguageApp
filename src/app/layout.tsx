import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthSync } from "@/components/AuthSync";

export const metadata: Metadata = {
  title: {
    default: "Deutsch Übungstests – Prüfungsvorbereitung A1 bis C1",
    template: "%s · Deutsch Übungstests",
  },
  description:
    "Kostenlose Übungstests für Deutschprüfungen von A1 bis C1 mit Hören, Lesen, Schreiben und Sprechen – inklusive Lösungen und Musterlösungen.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="flex min-h-screen flex-col">
        <AuthSync />
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
