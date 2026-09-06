import { INTEREST_FEATURES, INTEREST_PLACEMENTS } from "@/lib/interest";
import { interest } from "@/server/db";
import { callerIp, rateLimit } from "@/server/rate-limit";
import {
  fail,
  json,
  normaliseEmail,
  readJson,
  requireAccounts,
} from "@/server/http";

export const runtime = "nodejs";

type Body = { feature?: unknown; placement?: unknown; email?: unknown };

/**
 * Records that someone wants a feature which does not exist yet.
 *
 * Called twice by one interested learner, and both calls matter:
 *
 *   1. the moment they press the button, without an address — this is the
 *      number we are actually measuring, and it must survive someone changing
 *      their mind about the e-mail a second later,
 *   2. again if they then hand over an address.
 *
 * Two rows rather than one updated row, because the first one is anonymous by
 * design and adding the address to it later would turn a non-personal count
 * into personal data retroactively.
 */
export async function POST(request: Request) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const body = await readJson<Body>(request);

  const feature = INTEREST_FEATURES.find((f) => f === body.feature);
  const placement = INTEREST_PLACEMENTS.find((p) => p === body.placement);
  if (!feature || !placement) return fail("Unbekannte Angabe.");

  // Only per IP: there is no account to attach this to, and the click carries
  // no identifier we could count instead. Ten an hour is far above what one
  // learner does (two) and low enough to make the numbers useless to spam.
  const limit = await rateLimit(`interest:${callerIp(request)}`, 60, 3600);
  if (!limit.ok) {
    return fail(
      "Zu viele Anfragen. Bitte versuchen Sie es später noch einmal.",
      429,
    );
  }

  const store = await interest();

  // No e-mail: the click on its own. Deliberately no id of any kind — the row
  // is a tally mark, and a tally mark should not be traceable to a person.
  if (body.email === undefined || body.email === null || body.email === "") {
    await store.insertOne({ feature, placement, createdAt: new Date() });
    return json({ ok: true });
  }

  const email = normaliseEmail(body.email);
  if (!email) return fail("Bitte geben Sie eine gültige E-Mail-Adresse ein.");

  // Upsert, so pressing "Senden" twice does not look like two people. The
  // filter is the pair, not the address alone: the same learner may well want
  // to hear about a second feature later on.
  await store.updateOne(
    { feature, email },
    { $setOnInsert: { feature, email, placement, createdAt: new Date() } },
    { upsert: true },
  );

  // Same answer whether the address was new or already on the list. Telling
  // the difference would let anyone test which addresses have signed up.
  return json({ ok: true });
}
