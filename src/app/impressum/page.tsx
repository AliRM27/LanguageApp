import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold text-slate-900">Impressum</h1>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Noch auszufüllen.</strong> Ein Impressum ist in Deutschland nach
        § 5 DDG (früher § 5 TMG) Pflicht, sobald die Seite öffentlich erreichbar
        ist. Bitte vor dem Livegang die echten Angaben eintragen.
      </div>

      <div className="prose-exam text-sm text-slate-700">
        {[
          "Angaben gemäß § 5 DDG",
          "",
          "[Vorname Nachname]",
          "[Straße und Hausnummer]",
          "[PLZ Ort]",
          "",
          "Kontakt",
          "E-Mail: [E-Mail-Adresse]",
          "",
          "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
          "[Vorname Nachname, Anschrift wie oben]",
        ].join("\n")}
      </div>
    </div>
  );
}
