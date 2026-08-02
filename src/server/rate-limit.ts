import "server-only";
import { createHash } from "node:crypto";
import { rates } from "./db";

/**
 * Fixed-window rate limiting, counted in MongoDB.
 *
 * An in-memory counter is useless here: serverless spreads requests across
 * containers, so each one would keep its own count and the limit would be
 * whatever number of containers happen to be warm. The database is the only
 * thing all of them share.
 *
 * Keys are hashed before they are stored. The counter only ever needs to know
 * whether two requests belong together, never who they came from — so keeping
 * the raw e-mail address or IP would store personal data (including addresses
 * of people who merely mistyped one) for no benefit at all. Hashing makes the
 * whole collection non-personal and the privacy notice honest.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const id = createHash("sha256").update(`${key}:${bucket}`).digest("hex");
  const expiresAt = new Date((bucket + 1) * windowSeconds * 1000);

  const store = await rates();
  const doc = await store.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after" },
  );

  const count = doc?.count ?? 1;
  return {
    ok: count <= limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
    ),
  };
}

/**
 * A caller identifier for rate limiting.
 *
 * Behind Vercel the client address is only in `x-forwarded-for`; the first
 * entry is the real client, the rest are proxies.
 */
export function callerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
