"use client";

import { useEffect } from "react";

/**
 * The last resort: an error in the root layout itself.
 *
 * This replaces <html> entirely, so it cannot use the site header, the fonts or
 * anything from globals.css — hence the inline styles. It should almost never
 * be seen; it exists so that when it is, the page is still readable and in
 * German rather than a blank white screen.
 */
export default function GlobalError({
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
    <html lang="de">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          margin: 0,
          padding: "3rem 1.5rem",
          color: "#0f172a",
          lineHeight: 1.6,
        }}
      >
        <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Da ist etwas schiefgegangen.
          </h1>
          <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
            Entschuldigung – die Seite konnte nicht geladen werden. Ihre
            Antworten sind gespeichert. Bitte versuchen Sie es noch einmal.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#3149b0",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Noch einmal versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
