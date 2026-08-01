"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  authLogout,
  deleteAccount,
  fetchAttempts,
  forgetMe,
  getMe,
  type AttemptPayload,
} from "@/lib/api";
import { clearAllLocalAttempts, readLocalAttempt } from "@/lib/attempt-store";
import { Badge, Button, ButtonLink, Card } from "./ui";

interface TestSummary {
  id: string;
  title: string;
  level: string;
  sectionCount: number;
}

interface Row {
  test: TestSummary;
  submittedSections: number;
  answeredTasks: number;
  updatedAt: string | null;
}

/**
 * How many tasks have an actual answer.
 *
 * Counting only *submitted* sections hid every test that was still in progress,
 * which is exactly the work a learner most wants to find again.
 */
function countAnswered(answers: unknown): number {
  if (!answers || typeof answers !== "object") return 0;
  return Object.values(answers as Record<string, unknown>).filter((v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  }).length;
}

export function Dashboard({ tests }: { tests: TestSummary[] }) {
  const router = useRouter();
  const justVerified = useSearchParams().get("willkommen") === "1";

  const [email, setEmail] = useState<string | null>(null);
  const [accountsEnabled, setAccountsEnabled] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await getMe();
      setAccountsEnabled(me.enabled);
      setEmail(me.user?.email ?? null);

      let remote: AttemptPayload[] | null = null;
      if (me.enabled && me.user) {
        const result = await fetchAttempts();
        if (result.ok) remote = result.data.attempts;
      }

      setRows(
        tests.map((test) => {
          const match = remote?.find((a) => a.testId === test.id);
          if (match) {
            return {
              test,
              submittedSections: match.submittedSections.length,
              answeredTasks: countAnswered(match.answers),
              updatedAt: match.updatedAt,
            };
          }

          const local = readLocalAttempt(test.id);
          const answeredTasks = countAnswered(local.answers);
          const started = answeredTasks > 0 || local.submittedSections.length > 0;
          return {
            test,
            submittedSections: local.submittedSections.length,
            answeredTasks,
            updatedAt: started ? local.updatedAt : null,
          };
        }),
      );
      setLoading(false);
    })();
  }, [tests]);

  const signOut = async () => {
    await authLogout();
    forgetMe();
    router.push("/");
    router.refresh();
  };

  const removeAccount = async () => {
    if (
      !window.confirm(
        "Ihr Konto und alle gespeicherten Ergebnisse werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden. Wirklich löschen?",
      )
    ) {
      return;
    }

    setDeleting(true);
    const result = await deleteAccount();
    if (!result.ok) {
      setDeleting(false);
      window.alert(result.error);
      return;
    }

    // The account is gone; clear this browser too, or the next person here
    // would see the deleted learner's answers.
    clearAllLocalAttempts();
    forgetMe();
    router.push("/");
    router.refresh();
  };

  // Anything touched at all, most recently worked on first.
  const started = rows
    .filter((row) => row.submittedSections > 0 || row.answeredTasks > 0)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Mein Bereich</h1>
          <p className="mt-1 text-slate-600">
            {email
              ? `Angemeldet als ${email}`
              : "Ihr Fortschritt wird in diesem Browser gespeichert."}
          </p>
        </div>
        {email && (
          <Button variant="secondary" onClick={signOut}>
            Abmelden
          </Button>
        )}
      </header>

      {justVerified && email && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Ihre E-Mail-Adresse ist bestätigt und Sie sind angemeldet. Ab jetzt ist
          Ihr Fortschritt auf allen Geräten gleich.
        </div>
      )}

      {!accountsEnabled && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Die Anmeldung ist auf diesem Server nicht eingerichtet. Ihre Ergebnisse
          bleiben vorerst nur auf diesem Gerät gespeichert.
        </div>
      )}

      {accountsEnabled && !email && !loading && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
          <p className="text-slate-700">
            Melden Sie sich an, damit Ihr Fortschritt auch auf dem Handy und auf
            anderen Geräten verfügbar ist. Was Sie hier schon gemacht haben, wird
            dabei übernommen.
          </p>
          <ButtonLink href="/anmelden" className="mt-3">
            Anmelden
          </ButtonLink>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Ihre Übungstests</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Wird geladen …</p>
        ) : started.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">
              Sie haben noch keinen Übungstest begonnen.
            </p>
            <ButtonLink href="/uebungstests" className="mt-3">
              Übungstest starten
            </ButtonLink>
          </Card>
        ) : (
          // Grouped by level so A1 and A2 progress stay visually separate.
          <div className="space-y-6">
            {[...new Set(started.map((row) => row.test.level))]
              .sort()
              .map((level) => (
                <div key={level}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Niveau {level}
                  </h3>
                  <ul className="space-y-3">
                    {started
                      .filter((row) => row.test.level === level)
                      .map((row) => (
                        <li key={row.test.id}>
                          <Card className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900">
                                  {row.test.title}
                                </h4>
                                <Badge tone="info">{row.test.level}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">
                                {row.submittedSections > 0
                                  ? `${row.submittedSections} von ${row.test.sectionCount} Teilen abgegeben`
                                  : `begonnen · ${row.answeredTasks} ${
                                      row.answeredTasks === 1
                                        ? "Aufgabe"
                                        : "Aufgaben"
                                    } bearbeitet`}
                                {row.updatedAt &&
                                  ` · zuletzt ${new Date(row.updatedAt).toLocaleDateString("de-DE")}`}
                              </p>
                            </div>
                            <ButtonLink
                              href={
                                row.submittedSections > 0
                                  ? `/uebungstest/${row.test.id}/ergebnis`
                                  : `/uebungstest/${row.test.id}`
                              }
                              variant="secondary"
                            >
                              {row.submittedSections > 0
                                ? "Ergebnis"
                                : "Weitermachen"}
                            </ButtonLink>
                          </Card>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </section>

      {email && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Konto löschen</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Damit werden Ihre E-Mail-Adresse und alle gespeicherten Ergebnisse
            endgültig gelöscht. Das lässt sich nicht rückgängig machen.
          </p>
          <Button
            variant="secondary"
            onClick={removeAccount}
            disabled={deleting}
            className="mt-3 border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            {deleting ? "Wird gelöscht …" : "Konto und alle Daten löschen"}
          </Button>
        </section>
      )}
    </div>
  );
}
