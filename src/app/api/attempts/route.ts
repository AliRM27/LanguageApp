import { attempts, type AttemptDoc } from "@/server/db";
import { currentUser } from "@/server/auth/session";
import { fail, json, readJson, requireAccounts } from "@/server/http";

export const runtime = "nodejs";

export interface AttemptPayload {
  testId: string;
  answers: Record<string, unknown>;
  selfAssessment: Record<string, string>;
  submittedSections: string[];
  updatedAt: string;
}

const toPayload = (doc: AttemptDoc): AttemptPayload => ({
  testId: doc.testId,
  answers: doc.answers ?? {},
  selfAssessment: doc.selfAssessment ?? {},
  submittedSections: doc.submittedSections ?? [],
  updatedAt: doc.updatedAt.toISOString(),
});

/** Everything this learner has done — used by "Mein Bereich". */
export async function GET() {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const user = await currentUser();
  if (!user) return fail("Nicht angemeldet.", 401);

  const docs = await (await attempts()).find({ userId: user._id }).toArray();
  return json({ attempts: docs.map(toPayload) });
}

/**
 * Bulk import of whatever the browser did before signing in.
 *
 * Existing rows win: a record already in the account came from a real session,
 * whereas the browser copy may be older or from a shared computer.
 */
export async function POST(request: Request) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const user = await currentUser();
  if (!user) return fail("Nicht angemeldet.", 401);

  const body = await readJson<{ attempts?: AttemptPayload[] }>(request);
  const incoming = (Array.isArray(body.attempts) ? body.attempts : []).filter(
    (a) => typeof a?.testId === "string",
  );
  if (incoming.length === 0) return json({ imported: 0 });

  const store = await attempts();

  /**
   * `$setOnInsert` for everything, so a row already in the account is left
   * exactly as it is and only genuinely new tests are written.
   *
   * This has to be idempotent: after confirming an e-mail there are two tabs
   * signed in at once, and both try to import at the same moment. An
   * insertMany would have one of them fail on a duplicate key; an upsert simply
   * does nothing the second time.
   */
  const result = await store.bulkWrite(
    incoming.map((a) => ({
      updateOne: {
        filter: { _id: `${user._id}:${a.testId}` },
        update: {
          $setOnInsert: {
            userId: user._id,
            testId: a.testId,
            answers: a.answers ?? {},
            selfAssessment: a.selfAssessment ?? {},
            submittedSections: a.submittedSections ?? [],
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  return json({ imported: result.upsertedCount });
}
