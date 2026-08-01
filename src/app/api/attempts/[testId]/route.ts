import { attempts } from "@/server/db";
import { currentUser } from "@/server/auth/session";
import { fail, json, readJson, requireAccounts } from "@/server/http";
import type { AttemptPayload } from "../route";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ testId: string }> },
) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const user = await currentUser();
  if (!user) return fail("Nicht angemeldet.", 401);

  const { testId } = await params;
  const doc = await (await attempts()).findOne({ _id: `${user._id}:${testId}` });

  return json({
    attempt: doc
      ? {
          testId: doc.testId,
          answers: doc.answers ?? {},
          selfAssessment: doc.selfAssessment ?? {},
          submittedSections: doc.submittedSections ?? [],
          updatedAt: doc.updatedAt.toISOString(),
        }
      : null,
  });
}

/** Called on a debounce while the learner works, so it must be cheap. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ testId: string }> },
) {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  const user = await currentUser();
  if (!user) return fail("Nicht angemeldet.", 401);

  const { testId } = await params;
  const body = await readJson<AttemptPayload>(request);

  await (await attempts()).updateOne(
    { _id: `${user._id}:${testId}` },
    {
      $set: {
        answers: body.answers ?? {},
        selfAssessment: body.selfAssessment ?? {},
        submittedSections: body.submittedSections ?? [],
        updatedAt: new Date(),
      },
      $setOnInsert: { userId: user._id, testId },
    },
    { upsert: true },
  );

  return json({ ok: true });
}
