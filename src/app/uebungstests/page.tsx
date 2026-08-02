import type { Metadata } from "next";
import Link from "next/link";
import { getLevels, LEVEL_DESCRIPTION, levelSlug } from "@/lib/content";
import { Card } from "@/components/ui";
import { FreePhaseNotice } from "@/components/FreePhaseNotice";
import { canonical } from "@/lib/site";

export const metadata: Metadata = {
  title: "Übungstests nach Niveau",
  description:
    "Übungstests für die Deutschprüfung, geordnet nach Niveau von A1 bis C1.",
  alternates: canonical("/uebungstests"),
};

export default function LevelOverviewPage() {
  const levels = getLevels();

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Übungstests</h1>
        <p className="text-slate-600">
          Wählen Sie Ihr Niveau. Wenn Sie nicht sicher sind, beginnen Sie mit A1.
        </p>
      </header>

      <FreePhaseNotice />

      <ul className="space-y-4">
        {levels.map(({ level, count }) => (
          <li key={level}>
            <Link href={`/uebungstests/${levelSlug(level)}`} className="block">
              <Card className="transition hover:border-brand-300 hover:shadow">
                <div className="flex items-center gap-5">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-lg font-semibold text-brand-700">
                    {level}
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Niveau {level}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {LEVEL_DESCRIPTION[level]}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {count} {count === 1 ? "Übungstest" : "Übungstests"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
