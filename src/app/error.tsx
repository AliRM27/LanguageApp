"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * Shown when a page throws.
 *
 * Without this, Next renders its own English error screen — which is a bad
 * moment for someone at A1 to meet an untranslated stack of words. The learner
 * is told, in simple German, that their answers are safe, because the first
 * thought on seeing an error mid-test is "have I lost my work?" (They have not:
 * answers are written to the browser as they type.)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-5 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">
        Da ist etwas schiefgegangen.
      </h1>

      <p className="leading-relaxed text-slate-600">
        Entschuldigung – diese Seite konnte nicht geladen werden.{" "}
        <strong className="text-slate-800">
          Ihre Antworten sind gespeichert.
        </strong>{" "}
        Versuchen Sie es bitte noch einmal.
      </p>

      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Noch einmal versuchen</Button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Zur Startseite
        </Link>
      </div>

      {error.digest && (
        <p className="text-xs text-slate-400">Fehlernummer: {error.digest}</p>
      )}
    </div>
  );
}
