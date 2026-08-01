import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { sessions, users, type UserDoc } from "../db";

/**
 * Opaque session tokens, stored hashed.
 *
 * A JWT would avoid the database lookup, but it cannot be revoked — and this
 * app needs revocation for "sign out" and for account deletion. A random token
 * checked against a collection is simpler to reason about and cannot be forged
 * by anyone who obtains the signing secret, because there isn't one.
 *
 * Only the SHA-256 of the token is stored, so a leaked database dump does not
 * hand over working sessions.
 */

export const SESSION_COOKIE = "sitzung";
const SESSION_DAYS = 30;

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export function newUserId(): string {
  return randomUUID();
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);

  const store = await sessions();
  await store.insertOne({
    _id: hash(token),
    userId,
    createdAt: new Date(),
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user, or null. Also the only place a session is validated. */
export async function currentUser(): Promise<UserDoc | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const store = await sessions();
  const session = await store.findOne({ _id: hash(token) });

  // The TTL index removes expired sessions eventually, but "eventually" is up
  // to a minute, so the expiry is checked here too.
  if (!session || session.expiresAt.getTime() < Date.now()) return null;

  const found = await (await users()).findOne({ _id: session.userId });
  return found ?? null;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    const store = await sessions();
    await store.deleteOne({ _id: hash(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** Used when a password changes, so other devices are signed out. */
export async function destroyAllSessions(userId: string): Promise<void> {
  const store = await sessions();
  await store.deleteMany({ userId });
}
