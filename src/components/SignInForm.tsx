"use client";

import { useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, Card } from "./ui";

/**
 * Magic link only: no passwords to store, no reset flow to build, and one less
 * thing for a beginner-level user to get wrong.
 */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Anmelden</h1>
        <p className="text-sm text-slate-600">
          Die Anmeldung ist noch nicht eingerichtet. Sie können alle Übungstests
          trotzdem nutzen – Ihr Fortschritt wird in diesem Browser gespeichert.
        </p>
      </Card>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setStatus("sending");
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setMessage("Das hat leider nicht geklappt. Bitte versuchen Sie es erneut.");
      return;
    }

    setStatus("sent");
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-3xl font-semibold text-slate-900">Anmelden</h1>
      <p className="text-slate-600">
        Sie bekommen einen Link per E-Mail. Ein Passwort brauchen Sie nicht.
      </p>

      <Card>
        {status === "sent" ? (
          <div className="space-y-2">
            <p className="font-medium text-slate-900">E-Mail ist unterwegs.</p>
            <p className="text-sm text-slate-600">
              Bitte öffnen Sie den Link in der E-Mail an <strong>{email}</strong>.
              Schauen Sie auch im Spam-Ordner nach.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="name@beispiel.de"
            />
            <Button type="submit" disabled={status === "sending"} className="w-full">
              {status === "sending" ? "Wird gesendet …" : "Link senden"}
            </Button>
            {status === "error" && (
              <p className="text-sm text-rose-700">{message}</p>
            )}
          </form>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        Ohne Anmeldung funktioniert alles genauso – Ihr Fortschritt wird dann nur
        in diesem Browser gespeichert.
      </p>
    </div>
  );
}
