import "server-only";
import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";

/**
 * MongoDB connection for a serverless runtime.
 *
 * Each function invocation may reuse a warm container, so the client is cached
 * on `globalThis`. Without that, every request would open a new connection pool
 * and Atlas would refuse connections long before the app ran out of anything
 * else.
 */

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "uebungstests";

/** Accounts are optional: without a database the app runs browser-only. */
export const accountsEnabled = Boolean(uri);

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");

  const existing = globalThis.__mongoClient;
  if (existing) return existing;

  {
    const created = new MongoClient(uri, {
      // A small pool: serverless spreads load across containers anyway, and
      // Atlas' free tier caps total connections.
      maxPoolSize: 5,
      retryWrites: true,
    }).connect();
    globalThis.__mongoClient = created;
    return created;
  }
}

export async function db(): Promise<Db> {
  const client = await clientPromise();
  return client.db(dbName);
}

/* --------------------------------- shapes --------------------------------- */

export interface UserDoc {
  _id: string; // uuid
  email: string; // always lower-case
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface SessionDoc {
  _id: string; // sha256 of the cookie value — the raw token is never stored
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export type TokenPurpose = "verify-email" | "reset-password";

export interface TokenDoc {
  _id: string; // sha256 of the token in the link
  userId: string;
  purpose: TokenPurpose;
  expiresAt: Date;
  usedAt?: Date;
}

export interface AttemptDoc {
  _id: string; // `${userId}:${testId}` — one attempt per test per user
  userId: string;
  testId: string;
  answers: Record<string, unknown>;
  selfAssessment: Record<string, string>;
  submittedSections: string[];
  /**
   * Per section: { correct, total }, written when the learner submits it.
   *
   * Stored rather than derived so that "Mein Bereich" can show results without
   * the server having to load and score 18 tests on every page view, and
   * without the browser ever receiving an answer key.
   *
   * Optional: attempts written before this field existed simply have none.
   */
  scores?: Record<string, { correct: number; total: number }>;
  updatedAt: Date;
}

/** Counts requests per key per window, for throttling auth endpoints. */
export interface RateDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

/**
 * One expression of interest in a feature that does not exist yet.
 *
 * Two kinds of row live here, and the difference is the whole point:
 *
 *   without `email`  someone pressed the button — a cheap signal, and
 *                    deliberately anonymous: no user id, no session, no IP.
 *                    Nothing in the row points at a person, so it is not
 *                    personal data and still answers "how many wanted this".
 *   with `email`     someone asked to be told — an expensive signal, because
 *                    it costs the learner something to give.
 *
 * `_id` is left to MongoDB: a click has no natural key, and inventing one
 * would mean deriving it from something about the person.
 */
export interface InterestDoc {
  _id?: ObjectId;
  feature: string;
  placement: string;
  email?: string;
  createdAt: Date;
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await db()).collection<UserDoc>("users");
}
export async function sessions(): Promise<Collection<SessionDoc>> {
  return (await db()).collection<SessionDoc>("sessions");
}
export async function tokens(): Promise<Collection<TokenDoc>> {
  return (await db()).collection<TokenDoc>("tokens");
}
export async function attempts(): Promise<Collection<AttemptDoc>> {
  return (await db()).collection<AttemptDoc>("attempts");
}
export async function rates(): Promise<Collection<RateDoc>> {
  return (await db()).collection<RateDoc>("rates");
}
export async function interest(): Promise<Collection<InterestDoc>> {
  return (await db()).collection<InterestDoc>("interest");
}

/* --------------------------------- indexes -------------------------------- */

let indexesReady: Promise<void> | undefined;

/**
 * Created once per container rather than in a migration step, so a fresh
 * database works without anyone remembering to run anything.
 *
 * The TTL indexes matter: expired sessions and used tokens are removed by
 * MongoDB itself, so nothing accumulates and an expired session cannot be
 * resurrected by clock games.
 */
export function ensureIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const [u, s, t, a, r, i] = await Promise.all([
        users(),
        sessions(),
        tokens(),
        attempts(),
        rates(),
        interest(),
      ]);
      await Promise.all([
        u.createIndex({ email: 1 }, { unique: true }),
        s.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        s.createIndex({ userId: 1 }),
        t.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        t.createIndex({ userId: 1, purpose: 1 }),
        a.createIndex({ userId: 1 }),
        r.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        // Partial, not sparse. A sparse compound index skips a document only
        // when *every* indexed field is missing — and a click row does have
        // `feature`, so it would be indexed with a null e-mail. The second
        // click on the same feature would then collide with the first and the
        // insert would fail, which is precisely the number we are here to
        // count. Restricting the index to rows that actually carry an address
        // keeps "one sign-up per address" without touching the clicks.
        i.createIndex(
          { feature: 1, email: 1 },
          { unique: true, partialFilterExpression: { email: { $type: "string" } } },
        ),
        i.createIndex({ createdAt: 1 }),
      ]);
    })().catch((error) => {
      // Let the next request try again rather than caching a failure forever.
      indexesReady = undefined;
      throw error;
    });
  }
  return indexesReady;
}
