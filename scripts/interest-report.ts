/**
 * Reads out the fake-door test: how many people asked for a feature that does
 * not exist yet, and how many cared enough to leave an address.
 *
 * Run with `npm run report:interest`.
 *
 * A command-line script rather than an admin page, on purpose. An admin page
 * would need a login, a role, a route nobody may reach by accident and a UI to
 * maintain — for a number two people look at once a week. It would also be one
 * more place from which e-mail addresses can leak.
 *
 * How to read it: the click is the cheap signal and the e-mail is the dear one,
 * so the ratio between them says more than either column alone. A high click
 * count with almost no addresses means the idea sounds nice but nobody is
 * waiting for it.
 *
 * Two things that will otherwise mislead you:
 *
 *   Compare the quotes per row, not the totals. `startseite` sees far more
 *   visitors than the other two and none of them have tried a Sprechen task
 *   yet, so it will always supply most of the clicks. Adding the rows up
 *   answers "how many people saw a box and pressed it", which is not the
 *   question. If `startseite` converts far worse than `ergebnis`, that is the
 *   finding — the idea appeals more than it is needed.
 *
 *   The quote drifts with how many of your visitors are signed in, because for
 *   them the address is filled in and sending it costs one press instead of
 *   typing. A rising quote across a month when the sign-in share also rose is
 *   not necessarily rising demand. Deliberately not corrected for: the only
 *   fix would be marking each click as coming from a signed-in visitor, and
 *   that is exactly the identifier the click row promises not to carry.
 */
import "dotenv/config";
import { accountsEnabled, interest } from "../src/server/db";

const WINDOWS = [7, 30] as const;

interface Row {
  _id: { feature: string; placement: string };
  klicks: number;
  mails: number;
}

async function report(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const store = await interest();

  const rows = (await store
    .aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { feature: "$feature", placement: "$placement" },
          // A row is a sign-up if it carries an address, a click if it does
          // not — see InterestDoc.
          klicks: { $sum: { $cond: [{ $ifNull: ["$email", false] }, 0, 1] } },
          mails: { $sum: { $cond: [{ $ifNull: ["$email", false] }, 1, 0] } },
        },
      },
      { $sort: { "_id.feature": 1, "_id.placement": 1 } },
    ])
    .toArray()) as Row[];

  console.log(`\nLetzte ${days} Tage (seit ${since.toISOString().slice(0, 10)})`);

  if (rows.length === 0) {
    console.log("  keine Daten");
    return;
  }

  console.log(
    `  ${"Funktion".padEnd(12)}${"Platzierung".padEnd(26)}${"Klicks".padStart(8)}${"E-Mails".padStart(9)}${"Quote".padStart(8)}`,
  );

  let klicks = 0;
  let mails = 0;
  for (const row of rows) {
    klicks += row.klicks;
    mails += row.mails;
    console.log(
      `  ${row._id.feature.padEnd(12)}${row._id.placement.padEnd(26)}` +
        `${String(row.klicks).padStart(8)}${String(row.mails).padStart(9)}${quote(row.klicks, row.mails).padStart(8)}`,
    );
  }

  if (rows.length > 1) {
    // Volume, not a result. The per-row quotes are the comparable numbers.
    console.log(
      `  ${"summe".padEnd(38)}${String(klicks).padStart(8)}${String(mails).padStart(9)}${"".padStart(8)}`,
    );
  }
}

/**
 * Can exceed 100 %, and that is not a rounding error: the click is sent
 * without waiting for an answer, so a failed first request and a successful
 * second one leaves an address whose click was never counted. Rare, and better
 * shown than quietly capped.
 */
function quote(klicks: number, mails: number): string {
  if (klicks === 0) return mails > 0 ? "–" : "0 %";
  return `${Math.round((mails / klicks) * 100)} %`;
}

async function main() {
  if (!accountsEnabled) {
    console.error("MONGODB_URI ist nicht gesetzt – ohne Datenbank gibt es nichts zu zählen.");
    process.exit(1);
  }

  for (const days of WINDOWS) await report(days);
  console.log("");
  process.exit(0);
}

void main();
