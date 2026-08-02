/**
 * Everything about *who runs this site*, in one place.
 *
 * The Impressum, the Datenschutzerklärung, the e-mail footer and the page
 * metadata all read from here, so there is exactly one file to edit and no way
 * for the legal pages to disagree with each other.
 *
 * ---------------------------------------------------------------------------
 * BEFORE GOING LIVE: fill in `operator` below with real details.
 *
 * A German Impressum (§ 5 DDG) needs a name and a *ladungsfähige Anschrift* —
 * an address where post can legally be served. A P.O. box is not enough. If
 * anything is still marked TODO, the Impressum page shows a warning and
 * `npm run check:release` fails, so this cannot be forgotten by accident.
 * ---------------------------------------------------------------------------
 */

/** Marks a value that still has to be filled in. */
const TODO = (hint: string) => `TODO: ${hint}`;

export const site = {
  name: "Deutsch Test Online",
  shortDescription:
    "Kostenlose Übungstests für Deutschprüfungen mit Hören, Lesen, Schreiben und Sprechen.",

  operator: {
    /** Full legal name of the person or business running the site. */
    name: "Ali Mammadov",
    street: "Niederkasseler Lohweg 22",
    postalCode: "40547",
    city: "Düsseldorf",
    country: "Deutschland",

    /** Must be a real, monitored address — § 5 DDG requires quick contact. */
    email: "amammadov097@gmail.com",

    /**
     * Optional. Leave empty until they exist.
     *  - `vatId`: USt-IdNr. (§ 27a UStG). A Kleinunternehmer usually has none.
     *  - `phone`: not required if e-mail is answered promptly.
     */
    vatId: "",
    phone: "",
  },

  /**
   * The free phase. While this is true the whole library is open and the site
   * says so — see `FreePhaseNotice`. Flip it to false when payments go live.
   */
  freePhase: true,
} as const;

/** True when any required Impressum field is still a placeholder. */
export function operatorDetailsMissing(): boolean {
  const { name, street, postalCode, city, email } = site.operator;
  return [name, street, postalCode, city, email].some((value) =>
    value.startsWith("TODO:"),
  );
}

/**
 * The site's own origin, without a trailing slash.
 *
 * Vercel sets VERCEL_URL for preview deployments, which is what makes link
 * previews work on a branch without hard-coding anything.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * A self-referencing canonical for one page.
 *
 * Every indexable page must declare its *own* address. Setting `alternates` in
 * the root layout instead looks tempting and is a trap: Next merges metadata
 * shallowly, so every child page that does not override it inherits the
 * parent's canonical — which would tell Google that all 18 tests are duplicates
 * of the homepage, and quietly remove them from the index.
 *
 * It also matters now that the .com redirects to the .de: a canonical pins the
 * indexed address to one host no matter how someone arrived.
 */
export function canonical(path: string): { canonical: string } {
  return { canonical: path.startsWith("/") ? path : `/${path}` };
}

/** The postal address on one line, for e-mail footers and structured data. */
export function operatorAddressLine(): string {
  const o = site.operator;
  return `${o.name}, ${o.street}, ${o.postalCode} ${o.city}, ${o.country}`;
}
