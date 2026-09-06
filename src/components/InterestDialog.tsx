"use client";

import { useEffect, useRef, useState } from "react";
import { getMe } from "@/lib/api";
import { InterestCta } from "./InterestCta";
import { navControl } from "./ui";

/**
 * The header entry for a feature that does not exist yet, and the dialog behind
 * it.
 *
 * Opening this does **not** count as interest. Someone tapping an unfamiliar
 * word in a navigation bar is finding out what it is, which is not the same as
 * wanting it — counting that press would inflate the number with curiosity and
 * make this placement incomparable with the two inside the test, where the
 * button is pressed by someone who already knows what is on offer. So the
 * dialog just explains, and the same "Ja, das interessiert mich" button as
 * everywhere else is what gets recorded.
 *
 * A native <dialog> rather than a div: it comes with a focus trap, Escape to
 * close, inertness for the page behind it and a backdrop, all of which are easy
 * to write badly by hand and invisible when you do.
 */
export function InterestDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void getMe().then((me) => setEnabled(me.enabled));
  }, []);

  // showModal() is the only way to get the backdrop and the focus trap, and it
  // throws if called twice — hence the checks against the element's own state
  // rather than trusting React's.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Same reasoning as the panel: no database, no way to record an answer, so we
  // do not put the question in front of anyone.
  if (!enabled) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={navControl}>
        Sprechen üben
        {/*
          The label alone would read like a page that exists. The badge is what
          keeps the entry honest, so it stays at every width — it is the first
          thing that would be cut for space and the last thing that should be.
        */}
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
          In Arbeit
        </span>
      </button>

      <dialog
        ref={ref}
        aria-label="Sprechen üben mit Feedback"
        // onClose fires for Escape and for the close button alike, so the
        // element and the state cannot drift apart.
        onClose={() => setOpen(false)}
        // A click that lands on the dialog itself landed on the backdrop: the
        // content is in the div below, so anything hitting the element is
        // outside it.
        onClick={(event) => {
          if (event.target === ref.current) setOpen(false);
        }}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-0 shadow-lg backdrop:bg-slate-900/40"
      >
        <div className="relative p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Schließen"
            className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>

          {/* pr-10 keeps the heading clear of the close button. */}
          <InterestCta
            feature="sprechen"
            placement="navigation"
            variant="bare"
            className="pr-10"
          />
        </div>
      </dialog>
    </>
  );
}
