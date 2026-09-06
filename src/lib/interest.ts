/**
 * The features we are currently asking about, and the places we ask from.
 *
 * Deliberately its own module rather than something exported from the route:
 * the button in the browser and the whitelist on the server have to be the
 * same two strings, and a route file is not a safe place to import from — Next
 * treats those modules specially, and a client component must never pull one
 * into its bundle. Here the compiler keeps both ends honest and nothing
 * server-side comes along for the ride.
 *
 * `feature` is a union with one member on purpose. When "schreiben" is asked
 * about next, adding it here is the whole change, and every switch over a
 * feature that forgot about it stops compiling.
 */
export const INTEREST_FEATURES = ["sprechen"] as const;

/**
 * Where we ask. Kept few and named after the moment, not the page, because the
 * moment is what the number means:
 *
 *   ergebnis                just found out that their Sprechen was not graded
 *   sprechen-musterloesung  just compared their own answer to a model one
 *   navigation              opened the header entry from anywhere at all
 *
 * The first two measure a need someone is feeling right now; the third
 * measures whether the idea sounds good to someone passing by. Both are worth
 * knowing and they are not the same thing, which is why they must never be
 * added together — see the report.
 */
export const INTEREST_PLACEMENTS = [
  "ergebnis",
  "sprechen-musterloesung",
  "navigation",
  /** Retired when the header entry arrived; kept so old rows still read. */
  "startseite",
] as const;

export type InterestFeature = (typeof INTEREST_FEATURES)[number];
export type InterestPlacement = (typeof INTEREST_PLACEMENTS)[number];
