"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { readLocalAttempt } from "@/lib/attempt-store";
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
  updatedAt: string | null;
}

export function Dashboard({ tests }: { tests: TestSummary[] }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();

      // Remote progress when signed in, local progress otherwise.
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        setEmail(userData.user?.email ?? null);

        if (userData.user) {
          const { data } = await supabase
            .from("attempts")
            .select("test_id, submitted_sections, updated_at")
            .eq("user_id", userData.user.id);

          setRows(
            tests.map((test) => {
              const match = data?.find((row) => row.test_id === test.id);
              return {
                test,
                submittedSections: match?.submitted_sections?.length ?? 0,
                updatedAt: match?.updated_at ?? null,
              };
            }),
          );
          setLoading(false);
          return;
        }
      }

      setRows(
        tests.map((test) => {
          const local = readLocalAttempt(test.id);
          return {
            test,
            submittedSections: local.submittedSections.length,
            updatedAt: local.submittedSections.length ? local.updatedAt : null,
          };
        }),
      );
      setLoading(false);
    })();
  }, [tests]);

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const started = rows.filter((row) => row.submittedSections > 0);

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

      {!isSupabaseConfigured && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Die Anmeldung ist noch nicht eingerichtet. Ihre Ergebnisse bleiben
          vorerst nur auf diesem Gerät gespeichert.
        </div>
      )}

      {isSupabaseConfigured && !email && !loading && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
          <p className="text-slate-700">
            Melden Sie sich an, damit Ihr Fortschritt auch auf dem Handy und auf
            anderen Geräten verfügbar ist.
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
              Sie haben noch keinen Übungstest abgegeben.
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
                                {row.submittedSections} von{" "}
                                {row.test.sectionCount} Teilen abgegeben
                                {row.updatedAt &&
                                  ` · zuletzt ${new Date(row.updatedAt).toLocaleDateString("de-DE")}`}
                              </p>
                            </div>
                            <ButtonLink
                              href={`/uebungstest/${row.test.id}/ergebnis`}
                              variant="secondary"
                            >
                              Ergebnis
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
    </div>
  );
}
