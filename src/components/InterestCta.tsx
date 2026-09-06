"use client";

import { useEffect, useId, useState } from "react";
import { getMe, registerInterest, type Me } from "@/lib/api";
import type { InterestFeature, InterestPlacement } from "@/lib/interest";
import { site } from "@/lib/site";
import { Badge, Button } from "./ui";

/**
 * Asks whether a feature would be wanted, before it is built.
 *
 * The point is to find out how many learners want spoken feedback without
 * spending three months building it first. That only works if the question is
 * asked where the need is actually felt — see the two placements — and if the
 * wording never lets anyone believe the thing already exists. Nothing here
 * promises a date either: a missed date costs more trust than saying nothing.
 *
 * Two signals, in this order:
 *
 *   the click   cheap, and the one we must not lose. It is sent the instant
 *               the button is pressed, before the form is even on screen.
 *   the e-mail  expensive, because handing over an address costs something —
 *               which is what makes it worth more than the click.
 *
 * Whoever presses the button and then thinks better of the address still
 * counts. That is not a fallback, it is the measurement.
 *
 * Deutsch hier bewusst einfach: die Leserinnen und Leser lernen A1 bis B2.
 */
export function InterestCta({
  feature,
  placement,
  variant = "panel",
  className = "",
}: {
  feature: InterestFeature;
  placement: InterestPlacement;
  /**
   * "panel" draws its own tinted box, for sitting inline in a page. "bare"
   * leaves that to whatever contains it — the dialog already is a box, and two
   * nested ones read as a mistake.
   */
  variant?: "panel" | "bare";
  className?: string;
}) {
  const fieldId = useId();
  const [me, setMe] = useState<Me | null>(null);
  const [step, setStep] = useState<"button" | "form" | "done">("button");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getMe().then(setMe);
  }, []);

  // No database, no way to record the answer — so we do not ask the question.
  // Collecting a click we cannot store would be taking someone's attention for
  // nothing, and an address we cannot keep would be worse than that.
  if (!me?.enabled) return null;

  const accountEmail = me.user?.email ?? "";
  const prefilled = accountEmail !== "" && email === accountEmail;

  const askForEmail = () => {
    // Fired, not awaited: the form opens in the same tick. Waiting for the
    // round trip would put a spinner between the press and the field for no
    // gain, and the count is worth nothing if we lose it to a slow network.
    void registerInterest({ feature, placement });

    // Signed in: fill the address in, but still make them press send.
    //
    // The address is on file to run their account — a contract they entered
    // into (Art. 6 Abs. 1 lit. b). Putting it on a notification list is a
    // different purpose and rests on consent (lit. a), and consent has to be an
    // active choice. Recording it on this first click, where the button says
    // only "das interessiert mich", would take the decision away from them and
    // make the promise on the privacy page untrue. So we save the typing, not
    // the deciding.
    setEmail(accountEmail);
    setStep("form");
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result = await registerInterest({
      feature,
      placement,
      email: email.trim(),
    });

    setBusy(false);
    // The address stays in the field on failure — retyping it is exactly the
    // moment someone gives up.
    if (!result.ok) return setError(result.error);
    setStep("done");
  };

  return (
    <aside
      className={`text-sm leading-relaxed text-slate-700 ${
        variant === "panel"
          ? "rounded-xl border border-brand-200 bg-brand-50 p-4"
          : ""
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <strong className="font-semibold text-slate-900">
          Sprechen üben mit Feedback
        </strong>
        <Badge tone="neutral">In Arbeit</Badge>
      </div>

      <p className="mt-2">
        Wir überlegen, ob wir eine Übung zum Sprechen anbieten: Sie sprechen
        eine Aufgabe und nehmen sich dabei selbst auf. Danach bekommen Sie eine
        Rückmeldung zu Aussprache, Wortschatz und Aufgabenerfüllung – auch wenn
        Sie allein lernen und niemanden zum Üben haben.
      </p>

      {step === "button" && (
        <Button type="button" onClick={askForEmail} className="mt-3">
          Ja, das interessiert mich
        </Button>
      )}

      {step === "form" && (
        <form onSubmit={submitEmail} className="mt-3 space-y-2">
          <p className="text-slate-600">
            Danke! Möchten Sie Bescheid bekommen, falls es die Übung gibt?
          </p>

          <div className="space-y-1">
            <label
              htmlFor={fieldId}
              className="block text-sm font-medium text-slate-700"
            >
              E-Mail (freiwillig)
            </label>
            <input
              id={fieldId}
              type="email"
              required
              autoComplete="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // text-base below sm: under 16px iOS zooms in on focus and never
              // zooms back out.
              className="min-h-12 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
            />
            {/*
              Says where the address came from. An address that appears by
              itself looks like we already had plans for it; naming its source
              and offering to change it says the opposite. It also has a use:
              plenty of people sign up with one address and read another.
            */}
            {prefilled && (
              <p className="text-xs text-slate-500">
                Die Adresse aus Ihrem Konto. Sie können auch eine andere
                eintragen.
              </p>
            )}
          </div>

          {/*
            Above the button, not below it and not behind a link: this is what
            the person is agreeing to, so it has to be readable before the press
            rather than findable afterwards. No pre-ticked box — a tick nobody
            made is not a decision.
          */}
          <p className="text-xs leading-relaxed text-slate-600">
            Wir schreiben Ihnen genau eine E-Mail, wenn die Funktion fertig ist.
            Keine Werbung, keine Weitergabe. Sie können jederzeit widersprechen:{" "}
            <a
              href={`mailto:${site.operator.email}`}
              className="underline underline-offset-2"
            >
              {site.operator.email}
            </a>
            .
          </p>

          {/*
            Rendered even while empty, on purpose: a screen reader only
            announces changes inside a live region that was already in the
            document. A paragraph that appears at the same moment as the error
            it contains is usually read out too late, or not at all.
          */}
          <p aria-live="polite">
            {error && (
              <span className="block rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </span>
            )}
          </p>

          <Button type="submit" disabled={busy}>
            {busy ? "Einen Moment …" : "Benachrichtigen Sie mich"}
          </Button>
        </form>
      )}

      {step === "done" && (
        <p
          className="mt-3 rounded-lg bg-white/70 p-3 font-medium text-slate-900"
          aria-live="polite"
        >
          Danke, wir haben Ihre Adresse notiert. Sie hören von uns, sobald es so
          weit ist.
        </p>
      )}
    </aside>
  );
}
