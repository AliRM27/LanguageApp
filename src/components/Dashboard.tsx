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
import {
  clearAllLocalAttempts,
  readLocalAttempt,
  type SectionScores,
} from "@/lib/attempt-store";
import { PASS_THRESHOLD_PERCENT } from "@/lib/scoring";
import { SECTION_LABEL, type SectionKind } from "@/lib/schema";
import { Badge, Button, ButtonLink, Card } from "./ui";
import { ConfirmDialog } from "./ConfirmDialog";

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
  scores: SectionScores;
  updatedAt: string | null;
}

/** The two skills that are marked automatically; the other two are self-rated. */
const SCORED_SKILLS: SectionKind[] = ["hoeren", "lesen"];

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

const percent = (correct: number, total: number) =>
  total > 0 ? Math.round((correct / total) * 100) : null;

export function Dashboard({ tests }: { tests: TestSummary[] }) {
  const router = useRouter();
  const justVerified = useSearchParams().get("willkommen") === "1";

  const [email, setEmail] = useState<string | null>(null);
  const [accountsEnabled, setAccountsEnabled] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
              scores: (match.scores ?? {}) as SectionScores,
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
            scores: local.scores ?? {},
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
    setDeleting(true);
    setDeleteError("");

    const result = await deleteAccount();
    if (!result.ok) {
      setDeleting(false);
      setDeleteError(result.error);
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

  const finished = started.filter(
    (row) => row.submittedSections >= row.test.sectionCount,
  );

  /** Totals per skill across every test, so one bad day does not define it. */
  const bySkill = SCORED_SKILLS.map((kind) => {
    let correct = 0;
    let total = 0;
    for (const row of started) {
      const score = row.scores[kind];
      if (score) {
        correct += score.correct;
        total += score.total;
      }
    }
    return { kind, correct, total, percent: percent(correct, total) };
  });

  const scored = bySkill.filter((s) => s.total > 0);
  const overall = percent(
    scored.reduce((sum, s) => sum + s.correct, 0),
    scored.reduce((sum, s) => sum + s.total, 0),
  );
  const weakest =
    scored.length === 2
      ? [...scored].sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))[0]
      : null;
  const gapIsMeaningful =
    weakest && Math.abs((scored[0].percent ?? 0) - (scored[1].percent ?? 0)) >= 10;

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Mein Bereich</h1>
          <p className="mt-2 text-slate-600">
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          Ihre E-Mail-Adresse ist bestätigt und Sie sind angemeldet. Ab jetzt ist
          Ihr Fortschritt auf allen Geräten gleich.
        </div>
      )}

      {!accountsEnabled && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Die Anmeldung ist auf diesem Server nicht eingerichtet. Ihre Ergebnisse
          bleiben vorerst nur auf diesem Gerät gespeichert.
        </div>
      )}

      {accountsEnabled && !email && !loading && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm">
          <p className="leading-relaxed text-slate-700">
            Melden Sie sich an, damit Ihr Fortschritt auch auf dem Handy und auf
            anderen Geräten verfügbar ist. Was Sie hier schon gemacht haben, wird
            dabei übernommen.
          </p>
          <ButtonLink href="/anmelden" className="mt-4">
            Anmelden
          </ButtonLink>
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : (
        <>
          {scored.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Ihr Stand
              </h2>

              <Card className="space-y-7">
                <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4">
                  <Figure
                    value={overall === null ? "–" : `${overall} %`}
                    label="richtig insgesamt"
                    strong
                  />
                  <Figure
                    value={`${finished.length}`}
                    label={`von ${tests.length} Tests komplett`}
                  />
                  <Figure
                    value={`${started.length}`}
                    label="begonnen"
                  />
                </div>

                <div className="space-y-4">
                  {bySkill.map((skill) => (
                    <SkillBar
                      key={skill.kind}
                      label={SECTION_LABEL[skill.kind]}
                      percent={skill.percent}
                      correct={skill.correct}
                      total={skill.total}
                    />
                  ))}
                </div>

                <p className="border-t border-slate-100 pt-5 text-sm leading-relaxed text-slate-600">
                  {gapIsMeaningful && weakest ? (
                    <>
                      <strong className="font-semibold text-slate-800">
                        {SECTION_LABEL[weakest.kind]}
                      </strong>{" "}
                      fällt Ihnen im Moment am schwersten. Üben Sie diesen Teil
                      als Nächstes.
                    </>
                  ) : (
                    <>
                      Nur Hören und Lesen werden automatisch bewertet. Schreiben
                      und Sprechen vergleichen Sie selbst mit der Musterlösung.
                    </>
                  )}{" "}
                  In der Prüfung gelten meist {PASS_THRESHOLD_PERCENT} % als
                  bestanden.
                </p>
              </Card>
            </section>
          )}

          <section className="space-y-5">
            <h2 className="text-xl font-semibold text-slate-900">
              Ihre Übungstests
            </h2>

            {started.length === 0 ? (
              <Card className="text-center">
                <p className="text-slate-600">
                  Sie haben noch keinen Übungstest begonnen.
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  Fangen Sie mit A1 an, wenn Sie nicht sicher sind. Sie können
                  jederzeit aufhören und später weitermachen.
                </p>
                <ButtonLink href="/uebungstests" className="mt-6">
                  Übungstest starten
                </ButtonLink>
              </Card>
            ) : (
              // Grouped by level so A1 and A2 progress stay visually separate.
              <div className="space-y-8">
                {[...new Set(started.map((row) => row.test.level))]
                  .sort()
                  .map((level) => (
                    <div key={level}>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Niveau {level}
                      </h3>
                      <ul className="space-y-4">
                        {started
                          .filter((row) => row.test.level === level)
                          .map((row) => (
                            <li key={row.test.id}>
                              <TestRow row={row} />
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {email && (
        <section className="border-t border-slate-200 pt-8">
          <details className="group">
            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
              Konto verwalten
            </summary>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-semibold text-slate-900">Konto löschen</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Damit werden Ihre E-Mail-Adresse und alle gespeicherten
                Ergebnisse endgültig gelöscht. Das lässt sich nicht rückgängig
                machen.
              </p>
              {deleteError && (
                <p className="mt-3 text-sm text-rose-700">{deleteError}</p>
              )}
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(true)}
                className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-50"
              >
                Konto und alle Daten löschen
              </Button>
            </div>
          </details>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        danger
        busy={deleting}
        title="Konto wirklich löschen?"
        description="Ihre E-Mail-Adresse und alle Ergebnisse werden endgültig gelöscht. Das kann nicht rückgängig gemacht werden."
        confirmLabel={deleting ? "Wird gelöscht …" : "Endgültig löschen"}
        onConfirm={removeAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/* -------------------------------- pieces --------------------------------- */

function Figure({
  value,
  label,
  strong = false,
}: {
  value: string;
  label: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p
        className={
          strong
            ? "text-4xl font-semibold text-brand-700"
            : "text-2xl font-semibold text-slate-900"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function SkillBar({
  label,
  percent,
  correct,
  total,
}: {
  label: string;
  percent: number | null;
  correct: number;
  total: number;
}) {
  const done = percent !== null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="text-slate-500">
          {done ? (
            <>
              <span className="font-semibold text-slate-800">{percent} %</span>{" "}
              · {correct} von {total}
            </>
          ) : (
            "noch nicht abgegeben"
          )}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        {done && (
          <div
            // Below the pass mark it is amber rather than red: this is practice,
            // and a learner who is still working does not need to be alarmed.
            className={`h-full rounded-full ${
              percent >= PASS_THRESHOLD_PERCENT ? "bg-emerald-500" : "bg-amber-400"
            }`}
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        )}
      </div>
    </div>
  );
}

function TestRow({ row }: { row: Row }) {
  const complete = row.submittedSections >= row.test.sectionCount;

  const totals = SCORED_SKILLS.reduce(
    (acc, kind) => {
      const score = row.scores[kind];
      return score
        ? { correct: acc.correct + score.correct, total: acc.total + score.total }
        : acc;
    },
    { correct: 0, total: 0 },
  );
  const testPercent = percent(totals.correct, totals.total);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-slate-900">{row.test.title}</h4>
          <Badge tone="info">{row.test.level}</Badge>
          {complete && <Badge tone="success">fertig</Badge>}
        </div>

        <p className="mt-2 text-sm text-slate-600">
          {row.submittedSections > 0
            ? `${row.submittedSections} von ${row.test.sectionCount} Teilen abgegeben`
            : `begonnen · ${row.answeredTasks} ${
                row.answeredTasks === 1 ? "Aufgabe" : "Aufgaben"
              } bearbeitet`}
          {row.updatedAt &&
            ` · zuletzt ${new Date(row.updatedAt).toLocaleDateString("de-DE")}`}
        </p>

        {testPercent !== null && (
          <p className="mt-2 text-sm">
            <span
              className={`font-semibold ${
                testPercent >= PASS_THRESHOLD_PERCENT
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {testPercent} % richtig
            </span>{" "}
            <span className="text-slate-500">in Hören und Lesen</span>
          </p>
        )}
      </div>

      <ButtonLink
        href={
          row.submittedSections > 0
            ? `/uebungstest/${row.test.id}/ergebnis`
            : `/uebungstest/${row.test.id}`
        }
        variant="secondary"
      >
        {row.submittedSections > 0 ? "Ergebnis" : "Weitermachen"}
      </ButtonLink>
    </Card>
  );
}

/** Keeps the page from jumping once progress arrives. */
function Skeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
      <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
