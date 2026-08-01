import type { Metadata } from "next";
import { getAllTests } from "@/lib/content";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Mein Bereich",
  description: "Ihre bearbeiteten Übungstests und Ergebnisse.",
};

export default function DashboardPage() {
  // Content stays on the server; only ids and titles are handed to the client,
  // which then reads the user's own progress from Supabase.
  const tests = getAllTests().map((test) => ({
    id: test.id,
    title: test.title,
    level: test.level as string,
    sectionCount: test.sections.length,
  }));

  return <Dashboard tests={tests} />;
}
