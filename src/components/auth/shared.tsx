"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "../ui";

/** Checked in the browser and again on the server. */
export const MIN_PASSWORD_LENGTH = 8;

export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      {intro && <div className="text-slate-600">{intro}</div>}
      <Card>{children}</Card>
      {footer && <div className="text-sm text-slate-600">{footer}</div>}
    </div>
  );
}

export function NotConfigured({ title }: { title: string }) {
  return (
    <AuthShell title={title}>
      <p className="text-sm text-slate-600">
        Die Anmeldung ist noch nicht eingerichtet. Sie können alle Übungstests
        trotzdem nutzen – Ihr Fortschritt wird in diesem Browser gespeichert.
      </p>
    </AuthShell>
  );
}

export function Field({
  id,
  label,
  hint,
  ...props
}: React.ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        // text-base below sm: under 16px, iOS Safari zooms the page in when the
        // field gets focus and never zooms back out — on the sign-up form, the
        // first thing a new learner ever touches.
        className="min-h-12 w-full rounded-lg border-2 border-slate-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
        {...props}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{children}</p>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    // Permanently underlined, not hover-underlined: hover does not exist on a
    // phone, so the underline never appeared where it was needed most.
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-brand-700 underline underline-offset-2 hover:text-brand-800"
    >
      {children}
    </Link>
  );
}

