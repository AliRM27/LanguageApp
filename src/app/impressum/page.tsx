import type { Metadata } from "next";
import { operatorDetailsMissing, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung nach § 5 DDG.",
  robots: { index: false, follow: true },
};

/**
 * The Impressum.
 *
 * Required by § 5 DDG (the former § 5 TMG) as soon as the site is publicly
 * reachable and not purely private. Everything comes from `site.operator`, so
 * this page and the Datenschutzerklärung can never drift apart.
 *
 * Deliberately *not* included: a link to the EU ODR platform. That link was
 * mandatory for traders from 2016, but the platform was shut down on
 * 20 July 2025 (Regulation (EU) 2024/3228 repealed the ODR Regulation), and
 * many Impressum generators still hand out the dead URL.
 */
export default function ImpressumPage() {
  const o = site.operator;
  const incomplete = operatorDetailsMissing();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900">Impressum</h1>

      {incomplete && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Diese Seite ist noch nicht ausgefüllt.</strong> Tragen Sie die
          Angaben in <code className="font-mono">src/lib/site.ts</code> ein,
          bevor die Website öffentlich erreichbar ist. Ohne vollständiges
          Impressum drohen Abmahnungen.
        </div>
      )}

      <Section title="Angaben gemäß § 5 DDG">
        <address className="not-italic leading-relaxed">
          {o.name}
          <br />
          {o.street}
          <br />
          {o.postalCode} {o.city}
          <br />
          {o.country}
        </address>
      </Section>

      <Section title="Kontakt">
        <p>
          E-Mail:{" "}
          <a
            href={`mailto:${o.email}`}
            className="text-brand-600 underline underline-offset-2"
          >
            {o.email}
          </a>
        </p>
        {o.phone && <p className="mt-1">Telefon: {o.phone}</p>}
      </Section>

      {o.vatId && (
        <Section title="Umsatzsteuer-Identifikationsnummer">
          <p>Gemäß § 27a Umsatzsteuergesetz: {o.vatId}</p>
        </Section>
      )}

      <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          {o.name}, Anschrift wie oben.
        </p>
      </Section>

      <Section title="Verbraucherstreitbeilegung">
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an
          Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </Section>

      <Section title="Haftung für Inhalte und Links">
        <p>
          Die Inhalte dieser Website wurden mit Sorgfalt erstellt. Es handelt
          sich um eigenes Übungsmaterial; eine Gewähr für den Prüfungserfolg ist
          damit nicht verbunden. Für die Inhalte verlinkter externer Seiten sind
          deren Betreiber verantwortlich. Bei Bekanntwerden von
          Rechtsverletzungen entfernen wir entsprechende Inhalte umgehend.
        </p>
      </Section>

      <Section title="Urheberrecht">
        <p>
          Alle Texte, Aufgaben, Lösungen und Audiodateien auf dieser Website
          wurden eigenständig erstellt und sind urheberrechtlich geschützt. Die
          Nutzung für den eigenen Unterricht und das eigene Lernen ist
          ausdrücklich erwünscht. Eine Vervielfältigung oder Veröffentlichung
          außerhalb dieser Website bedarf unserer Zustimmung.
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 text-sm leading-relaxed text-slate-700">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
