import { users } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { consumeToken } from "@/server/auth/tokens";
import { destroyAllSessions } from "@/server/auth/session";
import {
  fail,
  json,
  MIN_PASSWORD_LENGTH,
  readJson,
  requireAccounts,
  validPassword,
} from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const body = await readJson<{ token?: unknown; password?: unknown }>(request);

  if (typeof body.token !== "string") return fail("Der Link ist ungültig.");
  if (!validPassword(body.password)) {
    return fail(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`);
  }

  const result = await consumeToken(body.token, "reset-password");
  if (!result.ok) {
    return fail(
      result.reason === "expired"
        ? "Der Link ist abgelaufen. Bitte fordern Sie einen neuen an."
        : "Der Link wurde schon benutzt oder ist ungültig.",
      400,
    );
  }

  await (await users()).updateOne(
    { _id: result.userId },
    {
      $set: {
        passwordHash: await hashPassword(body.password),
        // Someone resetting a password has proven they own the address.
        emailVerified: true,
      },
    },
  );

  // Whoever knew the old password must not stay signed in.
  await destroyAllSessions(result.userId);

  return json({ ok: true });
}
