import { NextResponse } from "next/server";
import { users } from "@/server/db";
import { createSession } from "@/server/auth/session";
import { consumeToken } from "@/server/auth/tokens";
import { requireAccounts } from "@/server/http";

export const runtime = "nodejs";

/**
 * The link from the confirmation e-mail.
 *
 * On success the learner is signed in immediately — asking someone to confirm
 * their address and *then* type their password again is a pointless extra step.
 */
export async function GET(request: Request) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const home = url.origin;

  if (!token) return NextResponse.redirect(`${home}/anmelden?fehler=link`);

  const result = await consumeToken(token, "verify-email");
  if (!result.ok) {
    // "used" is worth distinguishing: clicking the link twice is common and
    // usually means the person is already verified.
    return NextResponse.redirect(
      `${home}/anmelden?fehler=${result.reason === "used" ? "benutzt" : "link"}`,
    );
  }

  await (await users()).updateOne(
    { _id: result.userId },
    { $set: { emailVerified: true } },
  );
  await createSession(result.userId);

  return NextResponse.redirect(`${home}/mein-bereich?willkommen=1`);
}
