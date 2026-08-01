import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { tokens, type TokenPurpose } from "../db";

/**
 * Single-use, expiring tokens for the links sent by e-mail.
 *
 * Same reasoning as sessions: only the hash is stored, so the database never
 * contains a working link. Marking `usedAt` rather than deleting lets a second
 * click report "already used" instead of the more alarming "invalid".
 */

const TOKEN_HOURS = 1;

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export async function createToken(
  userId: string,
  purpose: TokenPurpose,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const store = await tokens();

  // Only the newest link should work: issuing a second reset must invalidate
  // the first, or an old e-mail stays usable for an hour.
  await store.deleteMany({ userId, purpose });

  await store.insertOne({
    _id: hash(token),
    userId,
    purpose,
    expiresAt: new Date(Date.now() + TOKEN_HOURS * 3600_000),
  });

  return token;
}

export type TokenResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "unknown" | "expired" | "used" };

export async function consumeToken(
  token: string,
  purpose: TokenPurpose,
): Promise<TokenResult> {
  const store = await tokens();
  const doc = await store.findOne({ _id: hash(token), purpose });

  if (!doc) return { ok: false, reason: "unknown" };
  if (doc.usedAt) return { ok: false, reason: "used" };
  if (doc.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  // Conditional update: two simultaneous clicks must not both succeed.
  const claimed = await store.findOneAndUpdate(
    { _id: doc._id, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } },
  );
  if (!claimed) return { ok: false, reason: "used" };

  return { ok: true, userId: doc.userId };
}
