import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold text-slate-900">
        Datenschutzerklärung
      </h1>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Entwurf – noch juristisch zu prüfen.</strong> Der folgende Text
        beschreibt, was die Anwendung technisch tatsächlich tut. Er ersetzt keine
        Rechtsberatung.
      </div>

      <section className="space-y-3 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">
          Welche Daten werden verarbeitet?
        </h2>
        <p>
          <strong>Ohne Anmeldung:</strong> Ihre Antworten werden ausschließlich
          lokal in Ihrem Browser gespeichert (localStorage). Diese Daten
          verlassen Ihr Gerät nicht und werden nicht an uns übertragen.
        </p>
        <p>
          <strong>Mit Anmeldung:</strong> Wir speichern Ihre E-Mail-Adresse,
          Ihr Passwort in verschlüsselter Form sowie Ihre Antworten und
          Ergebnisse, damit Ihr Fortschritt auf mehreren Geräten verfügbar ist.
          Die Speicherung erfolgt in unserer eigenen Datenbank (MongoDB Atlas, Rechenzentrum in der EU). Das
          Passwort im Klartext kennen weder wir noch der Dienstleister. Andere
          Nutzerinnen und Nutzer haben keinen Zugriff auf Ihre Daten.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">Löschung</h2>
        <p>
          Sie können Ihre Antworten jederzeit über „Test zurücksetzen“ löschen.
          Ihr gesamtes Konto mit allen Ergebnissen löschen Sie selbst unter
          „Mein Bereich“ – dafür müssen Sie niemanden anschreiben. Die Löschung
          erfolgt sofort und ist endgültig.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">
          Wer sieht Ihre Ergebnisse?
        </h2>
        <p>
          Niemand außer Ihnen. Es gibt keine Lehrer- oder Verwaltungsansicht.
          Technisch ist das über Row Level Security abgesichert: Jede Anfrage an
          die Datenbank kann nur Zeilen lesen und schreiben, die zu Ihrem eigenen
          Konto gehören.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">Tracking</h2>
        <p>
          Diese Website verwendet keine Werbe- oder Tracking-Cookies. Beim
          Anmelden wird ein technisch notwendiges Cookie für Ihre Sitzung gesetzt.
        </p>
      </section>
    </div>
  );
}
