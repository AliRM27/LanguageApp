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
  const incoming = Array.isArray(body.attempts) ? body.attempts : [];
  if (incoming.length === 0) return json({ imported: 0 });

  const store = await attempts();
  const existing = await store
    .find({ userId: user._id }, { projection: { testId: 1 } })
    .toArray();
  const known = new Set(existing.map((doc: { testId: string }) => doc.testId));

  const fresh = incoming.filter(
    (a) => typeof a.testId === "string" && !known.has(a.testId),
  );
  if (fresh.length === 0) return json({ imported: 0 });

  await store.insertMany(
    fresh.map((a) => ({
      _id: `${user._id}:${a.testId}`,
      userId: user._id,
      testId: a.testId,
      answers: a.answers ?? {},
      selfAssessment: a.selfAssessment ?? {},
      submittedSections: a.submittedSections ?? [],
      updatedAt: new Date(),
    })),
    { ordered: false },
  );

  return json({ imported: fresh.length });
}
