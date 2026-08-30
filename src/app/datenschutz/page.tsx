import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "Welche Daten diese Website verarbeitet, warum, wie lange und welche Rechte Sie haben.",
  robots: { index: false, follow: true },
};

/** Kept in sync by hand — shown as „Stand" at the top of the page. */
const LAST_UPDATED = "August 2026";

/**
 * The privacy notice.
 *
 * Written to describe what the code actually does, in language the learners can
 * read — most of them are studying German at A1/A2, so long legal sentences are
 * worse than useless here. Every claim below is checkable against the source:
 * retention periods come from the TTL indexes in `server/db.ts`, the cookie
 * from `server/auth/session.ts`, the hashing from `server/rate-limit.ts`.
 */
export default function DatenschutzPage() {
  const o = site.operator;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-900">
          Datenschutzerklärung
        </h1>
        <p className="text-sm text-slate-500">Stand: {LAST_UPDATED}</p>
      </header>

      <p className="rounded-lg bg-brand-50 p-4 text-sm leading-relaxed text-slate-700">
        <strong className="font-semibold">Kurz gesagt:</strong> Ohne Konto
        verlassen Ihre Antworten Ihren Browser nicht. Mit Konto speichern wir
        Ihre E-Mail-Adresse und Ihre Ergebnisse, damit Sie auf mehreren Geräten
        weiterlernen können. Wir verwenden keine Werbung und keine
        Cookies zur Nachverfolgung; die Besucherzahlen zählen wir anonym und
        ohne Cookies. Ihr Konto können Sie jederzeit selbst löschen.
      </p>

      <Section title="1. Verantwortlicher">
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:
        </p>
        <address className="not-italic leading-relaxed">
          {o.name}
          <br />
          {o.street}
          <br />
          {o.postalCode} {o.city}
          <br />
          {o.country}
          <br />
          E-Mail:{" "}
          <a
            href={`mailto:${o.email}`}
            className="text-brand-600 underline underline-offset-2"
          >
            {o.email}
          </a>
        </address>
      </Section>

      <Section title="2. Nutzung ohne Konto">
        <p>
          Sie können alle Übungstests ohne Anmeldung bearbeiten. Ihre Antworten
          werden dann ausschließlich lokal in Ihrem Browser gespeichert
          (localStorage). Diese Daten werden nicht an uns übertragen und sind
          für uns nicht sichtbar. Sie können sie jederzeit löschen, indem Sie
          einen Test zurücksetzen oder die Daten Ihres Browsers löschen.
        </p>
        <p>
          Diese Speicherung ist für den von Ihnen gewünschten Dienst unbedingt
          erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG) – ohne sie wäre Ihr Fortschritt
          nach jedem Seitenwechsel verloren. Eine Einwilligung ist dafür nicht
          nötig.
        </p>
      </Section>

      <Section title="3. Konto und Fortschritt">
        <p>Wenn Sie ein Konto anlegen, verarbeiten wir:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ihre E-Mail-Adresse,</li>
          <li>
            Ihr Passwort – ausschließlich als kryptografischer Hashwert
            (scrypt). Das Passwort im Klartext kennen wir nicht und können es
            auch nicht wiederherstellen,
          </li>
          <li>
            Ihre Antworten, Ihre Selbsteinschätzung zu Schreiben und Sprechen
            sowie den Bearbeitungsstand der Tests,
          </li>
          <li>
            den Zeitpunkt der Registrierung und der letzten Änderung Ihrer
            Ergebnisse.
          </li>
        </ul>
        <p>
          <strong>Zweck:</strong> Bereitstellung des Nutzerkontos, Speicherung
          Ihres Lernfortschritts über mehrere Geräte hinweg und Bestätigung
          Ihrer E-Mail-Adresse.
          <br />
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
          (Erfüllung des Nutzungsvertrags, den Sie mit der Registrierung
          schließen).
        </p>
        <p>
          Wir verlangen keinen Namen. Es gibt keine Lehrer-, Klassen- oder
          Verwaltungsansicht: <strong>niemand außer Ihnen sieht Ihre
          Ergebnisse.</strong> Technisch ist das dadurch sichergestellt, dass
          jede Datenbankabfrage auf dem Server fest an die Kennung Ihrer
          angemeldeten Sitzung gebunden ist; eine Anfrage, die fremde Daten
          lesen könnte, existiert nicht.
        </p>
      </Section>

      <Section title="4. Cookies">
        <p>
          Diese Website setzt <strong>ein einziges Cookie</strong>, und nur dann,
          wenn Sie sich anmelden: einen zufälligen Sitzungsschlüssel, mit dem der
          Server Sie bei der nächsten Anfrage wiedererkennt. Es ist
          <code className="mx-1 font-mono text-xs">httpOnly</code>
          gesetzt, läuft nach 30 Tagen ab und wird beim Abmelden gelöscht.
        </p>
        <p>
          Es gibt <strong>keine</strong> Werbe-, Tracking- oder
          Analyse-Cookies und keine Einbindung sozialer Netzwerke. Weil das
          Sitzungs-Cookie technisch notwendig ist, benötigen wir dafür keine
          Einwilligung – deshalb sehen Sie auf dieser Website auch kein
          Cookie-Banner.
        </p>
      </Section>

      <Section title="5. Server-Protokolle und Missbrauchsschutz">
        <p>
          Beim Aufruf der Website übermittelt Ihr Browser technisch notwendige
          Daten (IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browsertyp), die
          unser Hoster kurzzeitig in Server-Protokollen speichert. Das ist für
          den Betrieb und die Sicherheit der Website erforderlich.
          <br />
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an einem stabilen, sicheren Betrieb).
        </p>
        <p>
          Um Missbrauch der Anmeldung zu verhindern, zählen wir Anmeldeversuche
          pro E-Mail-Adresse und pro IP-Adresse. Gespeichert wird dabei
          ausschließlich ein <strong>nicht umkehrbarer Hashwert</strong> und ein
          Zähler; weder die E-Mail-Adresse noch die IP-Adresse selbst werden in
          unserer Datenbank abgelegt. Diese Zähler löschen sich automatisch nach
          15 Minuten.
        </p>
      </Section>

      <Section title="6. Besucherstatistik">
        <p>
          Wir möchten wissen, wie viele Menschen die Übungstests nutzen und
          welche Teile besonders gefragt sind. Dafür setzen wir{" "}
          <strong>Vercel Web Analytics</strong> ein – den Dienst unseres
          Hosters, es kommt also keine weitere Firma hinzu.
        </p>
        <p>
          Erfasst werden pro Aufruf: Zeitpunkt, aufgerufene Seite, woher Sie
          kamen, ungefähre Region, Betriebssystem, Browser und Gerätetyp.
          <strong> Es werden keine Cookies gesetzt</strong> und nichts auf Ihrem
          Gerät gespeichert. Besucherinnen und Besucher werden nur über einen
          Hashwert aus der Anfrage unterschieden, der nach 24 Stunden verfällt.
          Eine Wiedererkennung über mehrere Tage oder über andere Websites
          hinweg ist damit nicht möglich.
        </p>
        <p>
          Adressen mit persönlichen Angaben übermitteln wir gar nicht erst: Die
          Seite zum Zurücksetzen des Passworts wird vollständig aus der Statistik
          ausgenommen, und bei allen übrigen Seiten entfernen wir alles, was
          hinter dem Fragezeichen der Adresse steht, bevor etwas gesendet wird.
        </p>
        <p>
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse daran zu erfahren, ob und wie das Angebot
          genutzt wird). Weil nichts auf Ihrem Gerät gespeichert oder ausgelesen
          wird, ist dafür keine Einwilligung nach § 25 TDDDG erforderlich –
          deshalb sehen Sie hier weiterhin kein Cookie-Banner.
        </p>
      </Section>

      <Section title="7. Empfänger und Auftragsverarbeiter">
        <p>
          Wir geben Ihre Daten nicht an Dritte weiter, um damit Geld zu
          verdienen. Für den technischen Betrieb setzen wir folgende
          Dienstleister als Auftragsverarbeiter (Art. 28 DSGVO) ein:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Vercel Inc.</strong> (USA) – Hosting und Auslieferung der
            Website sowie die cookiefreie Besucherstatistik (siehe Punkt 6).
          </li>
          <li>
            <strong>MongoDB, Inc.</strong> (MongoDB Atlas) – Datenbank für
            Konten und Ergebnisse. Der Cluster wird in einer Region innerhalb
            der Europäischen Union betrieben.
          </li>
          <li>
            <strong>Resend, Inc.</strong> (USA) – Versand der Bestätigungs- und
            Passwort-E-Mails. Übermittelt wird dabei Ihre E-Mail-Adresse.
          </li>
        </ul>
        <p>
          Soweit dabei Daten in die USA übermittelt werden, stützen wir dies auf
          die Standardvertragsklauseln der EU-Kommission (Art. 46 Abs. 2 lit. c
          DSGVO) beziehungsweise auf eine Zertifizierung nach dem EU-US Data
          Privacy Framework (Art. 45 DSGVO).
        </p>
        <p className="text-slate-600">
          Hinweis zu den Hörtexten: Die Audiodateien wurden vorab mit einem
          Sprachsynthese-Dienst erzeugt und liegen als fertige Dateien auf
          unserem Server. Beim Anhören werden <strong>keine</strong> Daten von
          Ihnen an Dritte übertragen.
        </p>
      </Section>

      <Section title="8. Speicherdauer">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Konto und Ergebnisse:</strong> bis Sie Ihr Konto löschen.
          </li>
          <li>
            <strong>Anmelde-Sitzungen:</strong> 30 Tage, danach automatisch.
          </li>
          <li>
            <strong>Links aus E-Mails</strong> (Bestätigung, Passwort
            zurücksetzen): 1 Stunde, danach automatisch. Jeder Link gilt nur
            einmal.
          </li>
          <li>
            <strong>Zähler für Anmeldeversuche:</strong> 15 Minuten, danach
            automatisch.
          </li>
        </ul>
      </Section>

      <Section title="9. Löschung Ihres Kontos">
        <p>
          Unter <strong>„Mein Bereich“</strong> löschen Sie Ihr Konto selbst,
          mit allen Ergebnissen. Sie müssen dafür niemanden anschreiben und auf
          keine Antwort warten. Die Löschung erfolgt sofort und ist endgültig.
        </p>
      </Section>

      <Section title="10. Ihre Rechte">
        <p>Sie haben jederzeit das Recht auf</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO),</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
          <li>Löschung (Art. 17 DSGVO),</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
          <li>
            Widerspruch gegen Verarbeitungen auf Grundlage berechtigter
            Interessen (Art. 21 DSGVO).
          </li>
        </ul>
        <p>
          Wenden Sie sich dafür einfach an{" "}
          <a
            href={`mailto:${o.email}`}
            className="text-brand-600 underline underline-offset-2"
          >
            {o.email}
          </a>
          .
        </p>
        <p>
          Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde
          beschweren (Art. 77 DSGVO), zum Beispiel bei der Behörde des
          Bundeslandes, in dem Sie wohnen.
        </p>
      </Section>

      <Section title="11. Keine automatisierte Entscheidungsfindung">
        <p>
          Die automatische Auswertung von Hören und Lesen vergleicht Ihre
          Antworten mit den hinterlegten Lösungen. Damit ist keine rechtliche
          Wirkung verbunden – es ist eine Lernhilfe, keine Prüfung und kein
          Zertifikat. Ein Profiling findet nicht statt.
        </p>
      </Section>

      <Section title="12. Änderungen dieser Erklärung">
        <p>
          Wenn sich die Website ändert, passen wir diese Erklärung an. Die
          jeweils aktuelle Fassung finden Sie immer auf dieser Seite.
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
