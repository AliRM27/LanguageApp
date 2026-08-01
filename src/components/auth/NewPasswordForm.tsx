"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { forgetMe, resetPassword } from "@/lib/api";
import { Button } from "../ui";
import {
  AuthLink,
  AuthShell,
  Field,
  FormError,
  MIN_PASSWORD_LENGTH,
} from "./shared";

/**
 * Sets a new password. The token comes straight from the e-mail link, so this
 * page is reachable without a session — the token is the proof.
 */
export function NewPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <AuthShell
        title="Neues Passwort"
        footer={<AuthLink href="/passwort-vergessen">Neuen Link anfordern</AuthLink>}
      >
        <p className="text-sm text-slate-600">
          Dieser Link ist unvollständig. Bitte öffnen Sie ihn direkt aus der
          E-Mail oder fordern Sie einen neuen an.
        </p>
      </AuthShell>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`);
      return;
    }
    if (password !== repeat) {
      setError("Die beiden Passwörter sind nicht gleich.");
      return;
    }

    setBusy(true);
    setError("");

    const result = await resetPassword(token, password);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    // Every session was dropped server-side, so the cached identity is stale.
    forgetMe();
    router.push("/anmelden?passwort=neu");
    router.refresh();
  };

  return (
    <AuthShell title="Neues Passwort" intro="Wählen Sie ein neues Passwort.">
      <form onSubmit={submit} className="space-y-3">
        <Field
          id="password"
          label="Neues Passwort"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`}
        />
        <Field
          id="repeat"
          label="Neues Passwort wiederholen"
          type="password"
          autoComplete="new-password"
          required
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />

        <FormError>{error}</FormError>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Wird gespeichert …" : "Passwort speichern"}
        </Button>
      </form>
    </AuthShell>
  );
}
