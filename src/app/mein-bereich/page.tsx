import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllTests } from "@/lib/content";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Mein Bereich",
  description: "Ihre bearbeiteten Übungstests und Ergebnisse.",
};

export default function DashboardPage() {
  // Content stays on the server; only ids and titles reach the client, which
  // then loads the learner's own progress from the API.
  const tests = getAllTests().map((test) => ({
    id: test.id,
    title: test.title,
    level: test.level as string,
    sectionCount: test.sections.length,
  }));

  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-sm text-slate-500">Wird geladen …</p>
      }
    >
      <Dashboard tests={tests} />
    </Suspense>
  );
}
