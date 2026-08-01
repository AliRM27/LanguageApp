import { users } from "@/server/db";
import { createToken } from "@/server/auth/tokens";
import { resetPasswordMail, sendMail, siteUrl } from "@/server/email";
import { callerIp, rateLimit } from "@/server/rate-limit";
import { fail, json, normaliseEmail, readJson, requireAccounts } from "@/server/http";

export const runtime = "nodejs";

/**
 * Always answers the same way, whether or not the address is registered.
 *
 * Anything else turns this endpoint into a way to find out who has an account.
 */
export async function POST(request: Request) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const body = await readJson<{ email?: unknown }>(request);
  const email = normaliseEmail(body.email);
  if (!email) return fail("Bitte geben Sie eine gültige E-Mail-Adresse ein.");

  const perEmail = await rateLimit(`forgot:${email}`, 3, 900);
  const perIp = await rateLimit(`forgot-ip:${callerIp(request)}`, 10, 900);
  if (!perEmail.ok || !perIp.ok) {
    return fail("Zu viele Versuche. Bitte warten Sie ein paar Minuten.", 429);
  }

  const user = await (await users()).findOne({ email });
  if (user) {
    const token = await createToken(user._id, "reset-password");
    const sent = await sendMail(
      resetPasswordMail(email, `${siteUrl()}/passwort-neu?token=${token}`),
    );
    if (!sent.ok) console.error("Reset-E-Mail fehlgeschlagen:", sent.error);
  }

  return json({ ok: true });
}
