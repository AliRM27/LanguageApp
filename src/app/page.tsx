import Link from "next/link";
import { getAllTests, getLevels, LEVEL_DESCRIPTION, levelSlug } from "@/lib/content";
import { ButtonLink, Card } from "@/components/ui";
import { SECTION_LABEL } from "@/lib/schema";

export default function HomePage() {
  const tests = getAllTests();
  const firstTest = tests[0];
  const levels = getLevels();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm font-medium text-brand-600">
          Prüfungsvorbereitung Deutsch
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
          Deutsch üben wie in der Prüfung – kostenlos.
        </h1>
        <p className="text-lg leading-relaxed text-slate-600">
          Vollständige Übungstests mit Hören, Lesen, Schreiben und Sprechen. Hören
          und Lesen werden sofort ausgewertet, zu Schreiben und Sprechen gibt es
          eine Musterlösung zum Vergleichen.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink href="/uebungstests">Übungstest starten</ButtonLink>
          {firstTest && (
            <ButtonLink
              href={`/uebungstest/${firstTest.id}`}
              variant="secondary"
            >
              Direkt zu {firstTest.title}
            </ButtonLink>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          Wählen Sie Ihr Niveau
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {levels.map(({ level, count }) => (
            <Link key={level} href={`/uebungstests/${levelSlug(level)}`}>
              <Card className="h-full transition hover:border-brand-300 hover:shadow">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-semibold text-brand-700">
                    {level}
                  </span>
                  <div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {LEVEL_DESCRIPTION[level]}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {count} {count === 1 ? "Übungstest" : "Übungstests"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {(
          [
            {
              title: "Aufbau wie in der Prüfung",
              text: "Vier Teile, gleiche Aufgabentypen, empfohlene Zeiten – damit Sie am Prüfungstag nichts überrascht.",
            },
            {
              title: "Sofort auswerten",
              text: "Hören und Lesen werden automatisch korrigiert. Zu jeder Aufgabe gibt es eine kurze Erklärung.",
            },
            {
              title: "Musterlösungen",
              text: "Für Schreiben und Sprechen sehen Sie nach der Abgabe ein Beispiel für eine gute Antwort auf Ihrem Niveau.",
            },
            {
              title: "In Ihrem Tempo",
              text: "Der Hörtext lässt sich beliebig oft und langsamer abspielen. Ihr Fortschritt wird automatisch gespeichert.",
            },
          ] as const
        ).map((item) => (
          <Card key={item.title}>
            <h2 className="font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {item.text}
            </p>
          </Card>
        ))}
      </section>

      {firstTest && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">
            Das erwartet Sie
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {firstTest.sections.map((section) => (
              <Card key={section.kind} className="text-center">
                <p className="font-medium text-slate-900">
                  {SECTION_LABEL[section.kind]}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ca. {section.durationMinutes} Min.
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
