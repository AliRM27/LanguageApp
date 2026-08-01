import { attempts, sessions, tokens, users } from "@/server/db";
import { currentUser } from "@/server/auth/session";
import { fail, json, requireAccounts } from "@/server/http";

export const runtime = "nodejs";

/**
 * Deletes the account and everything belonging to it.
 *
 * The Datenschutz promises deletion; doing it by e-mail means the request waits
 * in an inbox. Order matters only in that the user document goes last, so a
 * failure part-way through leaves an account that can still sign in and retry
 * rather than orphaned rows nobody can reach.
 */
export async function DELETE() {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const user = await currentUser();
  if (!user) return fail("Nicht angemeldet.", 401);

  await (await attempts()).deleteMany({ userId: user._id });
  await (await tokens()).deleteMany({ userId: user._id });
  await (await sessions()).deleteMany({ userId: user._id });
  await (await users()).deleteOne({ _id: user._id });

  return json({ ok: true });
}
