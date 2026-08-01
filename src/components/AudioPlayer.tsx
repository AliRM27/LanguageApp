"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Audio for the Hören section.
 *
 * Two A1-specific affordances: unlimited replays (this is practice, not the
 * real exam) and a slower playback rate, which is the single most requested
 * feature from beginners.
 *
 * If the file is missing the player degrades to a clear notice instead of a
 * broken control — audio is produced by TTS separately from the text content.
 */
export function AudioPlayer({ src, label }: { src: string; label?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  if (unavailable) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Audio ist noch nicht verfügbar.</p>
        <p className="mt-1">
          Sie können die Aufgaben trotzdem bearbeiten. Nach der Abgabe sehen Sie
          den Text zum Hörverstehen.
        </p>
      </div>
    );
  }

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setUnavailable(true));
    } else {
      audio.pause();
    }
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setUnavailable(true));
  };

  const format = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setUnavailable(true)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Abspielen"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5-9-5.5z" />
            </svg>
          )}
        </button>

        <div className="min-w-[8rem] flex-1">
          {label && (
            <p className="mb-1 text-xs font-medium text-slate-600">{label}</p>
          )}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width]"
              style={{
                width: duration ? `${(progress / duration) * 100}%` : "0%",
              }}
            />
          </div>
          <p className="mt-1 text-xs tabular-nums text-slate-500">
            {format(progress)} / {format(duration)}
          </p>
        </div>

        <button
          type="button"
          onClick={restart}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Noch einmal
        </button>

        <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
          {[0.75, 1].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRate(value)}
              className={`px-3 py-2 text-xs font-medium transition ${
                rate === value
                  ? "bg-brand-600 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {value === 1 ? "Normal" : "Langsam"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
