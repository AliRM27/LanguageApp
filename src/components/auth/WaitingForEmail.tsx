"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshMe } from "@/lib/api";
import { mergeLocalAttemptsIntoAccount } from "@/lib/attempt-store";
import { Button } from "../ui";
import { AuthShell } from "./shared";

/**
 * The "check your e-mail" screen — which notices when the e-mail is confirmed.
 *
 * Clicking the link in a mail client opens a *new* tab. Without this, the
 * original tab sits there telling the learner to do something they have
 * already done, and they are left with two windows and no idea which one is
 * real. So this tab watches its own session: the confirmation link signs the
 * browser in, and the cookie is shared across tabs, so a plain poll of
 * /api/auth/me is enough to notice and move on.
 *
 * Polling only runs while the tab is visible — it usually is not, because the
 * learner is in their inbox — and it re-checks immediately on focus, which is
 * the moment that actually matters.
 */

const POLL_MS = 3000;
const GIVE_UP_MS = 10 * 60 * 1000;
const OFFER_RESEND_AFTER_MS = 45 * 1000;

export function WaitingForEmail({
  email,
  delivered,
  existing,
  onResend,
}: {
  email: string;
  delivered: boolean;
  existing: boolean;
  onResend: () => Promise<string | null>;
}) {
  const router = useRouter();

  const [offerResend, setOfferResend] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState("");

  const done = useRef(false);
  const startedAt = useRef(Date.now());

  const check = useCallback(async () => {
    if (done.current) return;

    const me = await refreshMe();
    if (!me.user) return;

    done.current = true;
    // Whatever this browser did anonymously belongs to the account now.
    await mergeLocalAttemptsIntoAccount();
    router.push("/mein-bereich?willkommen=1");
    router.refresh();
  }, [router]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (done.current) return;

      if (Date.now() - startedAt.current > GIVE_UP_MS) {
        setGaveUp(true);
        if (timer) clearInterval(timer);
        return;
      }
      if (Date.now() - startedAt.current > OFFER_RESEND_AFTER_MS) {
        setOfferResend(true);
      }
      if (document.visibilityState === "visible") void check();
    };

    timer = setInterval(tick, POLL_MS);

    // Coming back to this tab is exactly when the answer has probably changed.
    const onFocus = () => {
      if (!done.current && !gaveUp) void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [check, gaveUp]);

  const resend = async () => {
    setResending(true);
    setResendNote("");
    const error = await onResend();
    setResending(false);
    setResendNote(error ?? "Wir haben die E-Mail noch einmal geschickt.");
    startedAt.current = Date.now();
    setOfferResend(false);
    setGaveUp(false);
  };

  return (
    <AuthShell title="Fast fertig">
      <p className="font-medium text-slate-900">
        Bitte bestätigen Sie Ihre E-Mail-Adresse.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {existing
          ? "Dieses Konto ist noch nicht bestätigt. Wir haben Ihnen den Link noch einmal geschickt an "
          : "Wir haben eine E-Mail geschickt an "}
        <strong>{email}</strong>. Klicken Sie auf den Link darin. Diese Seite
        merkt es und geht dann automatisch weiter. Schauen Sie auch im
        Spam-Ordner nach.
      </p>

      {!delivered && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Hinweis für die Entwicklung: Es ist kein E-Mail-Dienst eingerichtet.
          Der Link steht im Terminal, in dem der Server läuft.
        </p>
      )}

      {gaveUp && (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          Wir warten nicht mehr weiter. Wenn Sie den Link auf einem anderen Gerät
          geöffnet haben – zum Beispiel auf dem Handy – melden Sie sich hier
          einfach mit Ihrem Passwort an.
        </p>
      )}

      {resendNote && (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {resendNote}
        </p>
      )}

      {(offerResend || gaveUp) && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            Keine E-Mail bekommen?
          </p>
          <Button
            variant="secondary"
            onClick={resend}
            disabled={resending}
            className="mt-2 w-full"
          >
            {resending ? "Wird gesendet …" : "E-Mail noch einmal senden"}
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
