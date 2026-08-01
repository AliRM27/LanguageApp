"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/api";
import { Button } from "../ui";
import { AuthLink, AuthShell, Field, FormError } from "./shared";

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result = await requestPasswordReset(email.trim());
    setBusy(false);

    if (!result.ok) setError(result.error);
    else setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Passwort vergessen">
        <p className="font-medium text-slate-900">E-Mail ist unterwegs.</p>
        <p className="mt-1 text-sm text-slate-600">
          Wenn es ein Konto mit <strong>{email}</strong> gibt, haben wir einen
          Link zum Zurücksetzen geschickt. Er gilt eine Stunde.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Passwort vergessen"
      intro="Wir schicken Ihnen einen Link, mit dem Sie ein neues Passwort wählen können."
      footer={<AuthLink href="/anmelden">Zurück zur Anmeldung</AuthLink>}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field
          id="email"
          label="E-Mail-Adresse"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@beispiel.de"
        />

        <FormError>{error}</FormError>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Wird gesendet …" : "Link senden"}
        </Button>
      </form>
    </AuthShell>
  );
}
