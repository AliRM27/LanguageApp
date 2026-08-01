import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">
        Seite nicht gefunden
      </h1>
      <p className="text-slate-600">
        Diese Seite gibt es leider nicht (mehr).
      </p>
      <ButtonLink href="/uebungstests">Zu den Übungstests</ButtonLink>
    </div>
  );
}
