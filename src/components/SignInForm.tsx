"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authStart, forgetMe, getMe } from "@/lib/api";
import { mergeLocalAttemptsIntoAccount } from "@/lib/attempt-store";
import { Button } from "./ui";
import {
  AuthLink,
  AuthShell,
  Field,
  FormError,
  MIN_PASSWORD_LENGTH,
  NotConfigured,
} from "./auth/shared";

/**
 * One form for signing in and signing up.
 *
 * The server decides which it is — see /api/auth/start. A learner should not
 * have to know whether they already have an account.
 */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<null | { delivered: boolean; existing: boolean }>(
    null,
  );

  useEffect(() => {
    void getMe().then((me) => setEnabled(me.enabled));
  }, []);

  if (enabled === false) return <NotConfigured title="Anmelden" />;

  const fehler = params.get("fehler");
  const passwortGeaendert = params.get("passwort") === "neu";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`);
      return;
    }

    setBusy(true);
    setError("");

    const result = await authStart(email.trim(), password);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    switch (result.data.status) {
      case "signed_in":
        // The cookie is set; anything done anonymously moves into the account.
        forgetMe();
        await mergeLocalAttemptsIntoAccount();
        router.push("/mein-bereich");
        router.refresh();
        return;

      case "wrong_password":
        setError(
          "Es gibt schon ein Konto mit dieser E-Mail-Adresse, aber das Passwort stimmt nicht.",
        );
        setBusy(false);
        return;

      case "verify_email":
        setSent({ delivered: result.data.delivered, existing: false });
        setBusy(false);
        return;

      case "unverified":
        setSent({ delivered: result.data.delivered, existing: true });
        setBusy(false);
        return;
    }
  };

  if (sent) {
    return (
      <AuthShell title="Fast fertig">
        <p className="font-medium text-slate-900">
          Bitte bestätigen Sie Ihre E-Mail-Adresse.
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {sent.existing
            ? "Dieses Konto ist noch nicht bestätigt. Wir haben Ihnen den Link noch einmal geschickt an "
            : "Wir haben eine E-Mail geschickt an "}
          <strong>{email}</strong>. Klicken Sie auf den Link darin, dann sind Sie
          angemeldet. Schauen Sie auch im Spam-Ordner nach.
        </p>
        {!sent.delivered && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Hinweis für die Entwicklung: Es ist kein E-Mail-Dienst eingerichtet.
            Der Link steht im Terminal, in dem der Server läuft.
          </p>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Anmelden"
      intro="Geben Sie Ihre E-Mail-Adresse und ein Passwort ein. Wenn Sie noch kein Konto haben, wird es automatisch erstellt."
      footer="Ohne Anmeldung funktioniert alles genauso – Ihr Fortschritt wird dann nur in diesem Browser gespeichert."
    >
      {passwortGeaendert && (
        <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          Ihr Passwort wurde geändert. Melden Sie sich jetzt damit an.
        </p>
      )}
      {fehler === "benutzt" && (
        <p className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          Dieser Link wurde schon benutzt. Melden Sie sich einfach an.
        </p>
      )}
      {fehler === "link" && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Der Link funktioniert nicht mehr. Jeder Link gilt nur einmal und läuft
          nach einer Stunde ab.
        </p>
      )}

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

        <div>
          <Field
            id="password"
            label="Passwort"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="mt-1 text-xs text-brand-600 hover:underline"
          >
            {showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
          </button>
        </div>

        <FormError>{error}</FormError>

        <Button type="submit" disabled={busy || enabled === null} className="w-full">
          {busy ? "Einen Moment …" : "Weiter"}
        </Button>

        <p className="text-right text-sm">
          <AuthLink href="/passwort-vergessen">Passwort vergessen?</AuthLink>
        </p>
      </form>
    </AuthShell>
  );
}
