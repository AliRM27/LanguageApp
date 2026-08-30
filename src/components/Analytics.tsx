"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

/**
 * Besucherstatistik.
 *
 * Vercel Web Analytics arbeitet ohne Cookies: Besucher werden über einen Hash
 * aus der Anfrage erkannt, der nach 24 Stunden verfällt. Deshalb braucht es
 * keine Einwilligung nach § 25 TDDDG und kein Cookie-Banner.
 *
 * `beforeSend` ist hier nicht optional. Vercel speichert zu jedem Aufruf die
 * URL *einschließlich Query-Parametern* — und zwei unserer Adressen tragen
 * Geheimnisse darin:
 *
 *   /passwort-neu?token=…      der einmalige Link aus der E-Mail
 *   /mein-bereich?willkommen=1 harmlos, aber es gibt keinen Grund, ihn zu senden
 *
 * Ein Token, der einmal bei einem Dritten gelandet ist, ist verbrannt, auch
 * wenn er nur eine Stunde gilt. Also: die Passwortseite gar nicht melden und
 * bei allen anderen die Query abschneiden. Für die Frage „welche Tests werden
 * benutzt?“ brauchen wir sie ohnehin nie.
 */
export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        let url: URL;
        try {
          url = new URL(event.url);
        } catch {
          return event;
        }

        if (url.pathname.startsWith("/passwort-neu")) return null;

        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
