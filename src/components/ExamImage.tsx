"use client";

import { useState } from "react";

/**
 * A picture that is part of the exam, not decoration.
 *
 * It degrades the same way the audio player does: if the file is missing the
 * learner sees a clear notice and a description of the scene rather than a
 * broken-image icon, so the task is still doable and a new test can be
 * reviewed before the photographs have been sourced.
 */
export function ExamImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <figure className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <figcaption className="text-sm font-medium text-amber-900">
          Bild noch nicht verfügbar
        </figcaption>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">{alt}</p>
      </figure>
    );
  }

  return (
    <figure className="overflow-hidden rounded-lg bg-slate-200">
      {/* Not next/image: these are plain files in /public, already sized down
          when they are added, and the fallback above matters more here than
          any optimisation.

          `max-h` matters for portrait photographs: at full column width a
          3:2 upright picture is over a thousand pixels tall and the learner
          scrolls past the questions before reaching them. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="mx-auto max-h-[32rem] w-auto max-w-full object-contain"
      />
    </figure>
  );
}
