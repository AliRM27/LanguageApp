import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

/**
 * The app has three white-ish surfaces — cards, reading panels and controls —
 * and until now they looked the same. A `secondary` button was white with a
 * thin slate border, which is exactly what a Card is, so nothing announced
 * itself as tappable. Controls are now *filled* rather than outlined: fill is
 * the signal that something is a control, borders alone are not.
 *
 * `min-h-11` is 44px, the smallest target Apple's guidelines allow and roughly
 * the width of an adult fingertip. Most of these buttons were 40px.
 */
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700 shadow-sm",
  secondary:
    "bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 active:bg-slate-200",
  ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-100",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

/**
 * Going back a level.
 *
 * There were three of these, hand-written in three places, each a bare text
 * link styled `text-brand-600 hover:underline`. On a phone that is doubly
 * wrong: hover never fires, so the underline never appears, and the target is
 * only as tall as the text — about 20px against a 44px minimum. It sits at the
 * top of the screen where thumbs reach first, so it was the easiest thing on
 * the page to miss.
 *
 * Now: a real bordered control, permanently underlined text, full height, and
 * one wording for the whole app.
 */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M10 13 5 8l5-5" />
      </svg>
      <span className="underline underline-offset-2">{children}</span>
    </Link>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Reading material: a text the learner works *from*, never taps.
 *
 * Deliberately unlike both cards and options — flat, tinted, no border — so an
 * exam text can never be mistaken for something to select. This distinction is
 * the whole point: on a Lesen page an advert and its answer options sit
 * directly next to each other.
 */
export function ReadingPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-slate-100 p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "error" | "info";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-800",
    info: "bg-brand-100 text-brand-700",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
