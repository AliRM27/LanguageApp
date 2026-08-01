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
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
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
    <Link href={href} className="text-brand-600 hover:underline">
      {children}
    </Link>
  );
}

