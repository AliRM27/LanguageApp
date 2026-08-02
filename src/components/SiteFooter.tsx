import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-5 py-12 sm:px-6 text-sm text-slate-500">
        <nav className="flex flex-wrap gap-4">
          <Link href="/uebungstests" className="hover:text-slate-800">
            Übungstests
          </Link>
          <Link href="/impressum" className="hover:text-slate-800">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-slate-800">
            Datenschutz
          </Link>
        </nav>

        {/* Required: the exam format is free to use, the trademark is not. */}
        <p className="rounded-lg bg-slate-50 p-4 text-xs leading-relaxed">
          <strong className="font-semibold text-slate-700">Hinweis:</strong> Diese
          Website bietet eigene Übungstests in einem Format, das den bekannten
          Sprachprüfungen ähnlich ist. Wir stehen in keiner Verbindung zur telc
          gGmbH, zum Goethe-Institut, zu IELTS oder zu anderen Prüfungsanbietern
          und sind von diesen weder lizenziert noch autorisiert. Alle genannten
          Marken gehören ihren jeweiligen Inhabern. Alle Texte, Aufgaben und
          Audiodateien auf dieser Website wurden eigenständig erstellt.
        </p>

        <p className="text-xs">
          © {new Date().getFullYear()} Deutsch Test Online
        </p>
      </div>
    </footer>
  );
}
