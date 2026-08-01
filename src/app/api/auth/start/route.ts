import { users } from "@/server/db";
import {
  fakeVerifyDelay,
  hashPassword,
  verifyPassword,
} from "@/server/auth/password";
import { createSession, newUserId } from "@/server/auth/session";
import { createToken } from "@/server/auth/tokens";
import { sendMail, siteUrl, verifyEmailMail } from "@/server/email";
import { callerIp, rateLimit } from "@/server/rate-limit";
import {
  fail,
  json,
  MIN_PASSWORD_LENGTH,
  normaliseEmail,
  readJson,
  requireAccounts,
  validPassword,
} from "@/server/http";

export const runtime = "nodejs";

type Body = { email?: unknown; password?: unknown };

export type StartResult =
  | { status: "signed_in" }
  | { status: "wrong_password" }
  | { status: "verify_email"; delivered: boolean }
  | { status: "unverified"; delivered: boolean };

/**
 * The single entry point for signing in and signing up.
 *
 * A learner types an e-mail and a password; the server decides what that means:
 *
 *   - account exists, password correct, verified  -> signed in
 *   - account exists, password correct, unverified -> new verification e-mail
 *   - account exists, password wrong               -> told the password is wrong
 *   - no account                                   -> created, verification sent
 *
 * Nobody has to know in advance whether they are registering or returning,
 * which is the whole point of not having a separate sign-up page.
 */
export async function POST(request: Request) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const body = await readJson<Body>(request);
  const email = normaliseEmail(body.email);
  const password = body.password;

  if (!email) return fail("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
  if (!validPassword(password)) {
    return fail(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`);
  }

  // Two limits: one per address, so a single account cannot be brute-forced,
  // and one per IP, so a single attacker cannot spread across many addresses.
  const perEmail = await rateLimit(`start:${email}`, 10, 900);
  const perIp = await rateLimit(`start-ip:${callerIp(request)}`, 30, 900);
  if (!perEmail.ok || !perIp.ok) {
    return fail(
      "Zu viele Versuche. Bitte warten Sie ein paar Minuten und versuchen Sie es dann noch einmal.",
      429,
    );
  }

  const store = await users();
  const existing = await store.findOne({ email });

  if (existing) {
    const correct = await verifyPassword(password, existing.passwordHash);
    if (!correct) return json<StartResult>({ status: "wrong_password" });

    if (!existing.emailVerified) {
      const token = await createToken(existing._id, "verify-email");
      const sent = await sendMail(
        verifyEmailMail(email, `${siteUrl()}/api/auth/verify?token=${token}`),
      );
      if (!sent.ok) return fail(mailError(sent.error), 502);
      return json<StartResult>({ status: "unverified", delivered: sent.delivered });
    }

    await createSession(existing._id);
    return json<StartResult>({ status: "signed_in" });
  }

  // Keep the timing similar to the "wrong password" path, so response time
  // does not reveal whether an address is registered.
  await fakeVerifyDelay();

  const id = newUserId();
  try {
    await store.insertOne({
      _id: id,
      email,
      passwordHash: await hashPassword(password),
      emailVerified: false,
      createdAt: new Date(),
    });
  } catch (error) {
    // Unique index on email: two simultaneous sign-ups for the same address.
    if ((error as { code?: number }).code === 11000) {
      return json<StartResult>({ status: "wrong_password" });
    }
    throw error;
  }

  const token = await createToken(id, "verify-email");
  const sent = await sendMail(
    verifyEmailMail(email, `${siteUrl()}/api/auth/verify?token=${token}`),
  );
  if (!sent.ok) return fail(mailError(sent.error), 502);

  return json<StartResult>({ status: "verify_email", delivered: sent.delivered });
}

function mailError(detail: string): string {
  console.error("E-Mail konnte nicht verschickt werden:", detail);
  return "Die Bestätigungs-E-Mail konnte nicht verschickt werden. Bitte melden Sie sich beim Betreiber.";
}
