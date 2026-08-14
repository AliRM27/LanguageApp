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

  /**
   * Ten seconds back.
   *
   * The single most useful control in a listening exercise: a learner who
   * misses a telephone number needs to hear that one sentence again, and
   * without this the only option was replaying the whole track from the start.
   */
  const back10 = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  /**
   * Dragging the slider seeks.
   *
   * `progress` is updated here as well as by the audio element's own
   * timeupdate: without it the handle springs back to the old position between
   * the drag and the next timeupdate, which feels broken.
   */
  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seconds = Number(event.target.value);
    audio.currentTime = seconds;
    setProgress(seconds);
  };

  /** Guarded: duration is NaN until the metadata has loaded. */
  const percent = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

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

      {label && (
        <p className="mb-3 text-xs font-medium text-slate-600">{label}</p>
      )}

      {/* Row 1: play, scrubber, time. Everything else moves below on a phone —
          the old single row needed about 500px and wrapped into a jumble. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Abspielen"}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 active:bg-brand-700"
        >
          {playing ? (
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5-9-5.5z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            className="audio-range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={progress}
            disabled={!duration}
            onChange={seek}
            aria-label="Position im Hörtext"
            aria-valuetext={`${format(progress)} von ${format(duration)}`}
            style={
              {
                "--track": `linear-gradient(to right, var(--color-brand-500) ${percent}%, #cbd5e1 ${percent}%)`,
              } as React.CSSProperties
            }
          />
          <p className="text-xs tabular-nums text-slate-500">
            {format(progress)} / {format(duration)}
          </p>
        </div>
      </div>

      {/* Row 2: the three secondary controls, equal width and thumb-sized. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={restart}
          className="flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-100"
        >
          Von vorn
        </button>

        <div
          role="group"
          aria-label="Geschwindigkeit"
          className="flex min-h-11 overflow-hidden rounded-lg border border-slate-300 bg-white"
        >
          {[0.75, 1].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={rate === value}
              onClick={() => setRate(value)}
              className={`flex-1 px-1 text-xs font-medium transition ${
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
