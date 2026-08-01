import { accountsEnabled } from "@/server/db";
import { currentUser } from "@/server/auth/session";
import { json, type MeResponse } from "@/server/http";

export const runtime = "nodejs";

/** Who am I? The client asks once on load and caches the answer. */
export async function GET() {
  if (!accountsEnabled) {
    return json<MeResponse>({ enabled: false, user: null });
  }

  const user = await currentUser();
  return json<MeResponse>({
    enabled: true,
    user: user
      ? { id: user._id, email: user.email, emailVerified: user.emailVerified }
      : null,
  });
}
