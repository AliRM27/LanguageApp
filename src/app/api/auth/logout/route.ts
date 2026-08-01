import { destroyCurrentSession } from "@/server/auth/session";
import { json, requireAccounts } from "@/server/http";

export const runtime = "nodejs";

export async function POST() {
  const unavailable = await requireAccounts();
  if (unavailable) return unavailable;

  await destroyCurrentSession();
  return json({ ok: true });
}
