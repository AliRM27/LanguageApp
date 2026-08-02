import { site } from "@/lib/site";

/**
 * Says out loud that the free phase is temporary.
 *
 * The whole library is open during the test phase, because the point of it is
 * to find out whether the later tests hold up in front of real learners — and
 * they cannot, if nobody can reach them. But saying nothing now and putting up
 * a paywall later reads as a bait-and-switch, so the plan is stated up front
 * instead: free today, partly paid later, and whoever helps us test it keeps
 * what they have.
 *
 * No date is promised, because a missed date is worse than no date.
 *
 * German here is deliberately simple: the readers are studying at A1 and A2.
 */

/**
 * The promise made to early users. If you ever change your mind about
 * grandfathering, this is the one string to change — but note that people will
 * have read it, so changing it later is a real broken promise, not a typo fix.
 */
const GRANDFATHER_PROMISE =
  "Wenn Sie jetzt ein Konto anlegen, bleiben diese Übungstests für Sie dauerhaft kostenlos.";

export function FreePhaseNotice({ className = "" }: { className?: string }) {
  if (!site.freePhase) return null;

  return (
    <aside
      className={`rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm leading-relaxed text-slate-700 ${className}`}
    >
      <p>
        <strong className="font-semibold text-slate-900">
          Zurzeit ist alles kostenlos.
        </strong>{" "}
        Die Website ist neu und wir verbessern sie mit Ihrer Hilfe. Später wird
        ein Teil der Übungstests kostenpflichtig sein. {GRANDFATHER_PROMISE}
      </p>
    </aside>
  );
}
