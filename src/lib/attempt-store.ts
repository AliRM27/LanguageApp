"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";
import type { Answers, AnswerValue, SelfAssessment, SelfRating } from "./scoring";
import type { SectionKind } from "./schema";

export interface Attempt {
  testId: string;
  answers: Answers;
  selfAssessment: SelfAssessment;
  submittedSections: SectionKind[];
  updatedAt: string;
}

const storageKey = (testId: string) => `uebungstest:attempt:${testId}`;

function emptyAttempt(testId: string): Attempt {
  return {
    testId,
    answers: {},
    selfAssessment: {},
    submittedSections: [],
    updatedAt: new Date(0).toISOString(),
  };
}

/* ------------------------------- local store ------------------------------ */

export function readLocalAttempt(testId: string): Attempt {
  if (typeof window === "undefined") return emptyAttempt(testId);
  try {
    const raw = window.localStorage.getItem(storageKey(testId));
    if (!raw) return emptyAttempt(testId);
    return { ...emptyAttempt(testId), ...(JSON.parse(raw) as Attempt) };
  } catch {
    return emptyAttempt(testId);
  }
}

function writeLocalAttempt(attempt: Attempt) {
  try {
    window.localStorage.setItem(storageKey(attempt.testId), JSON.stringify(attempt));
  } catch {
    // Storage full or blocked (private mode) — the in-memory state still works.
  }
}

/* ------------------------------ remote store ------------------------------ */

async function readRemoteAttempt(testId: string): Promise<Attempt | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("attempts")
    .select("answers, self_assessment, submitted_sections, updated_at")
    .eq("test_id", testId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    testId,
    answers: (data.answers ?? {}) as Answers,
    selfAssessment: (data.self_assessment ?? {}) as SelfAssessment,
    submittedSections: (data.submitted_sections ?? []) as SectionKind[],
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

async function writeRemoteAttempt(attempt: Attempt): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase.from("attempts").upsert(
    {
      user_id: userData.user.id,
      test_id: attempt.testId,
      answers: attempt.answers,
      self_assessment: attempt.selfAssessment,
      submitted_sections: attempt.submittedSections,
    },
    { onConflict: "user_id,test_id" },
  );
}

/* --------------------------------- hook ---------------------------------- */

/**
 * Local-first: state lives in the browser and is written synchronously, so the
 * test works offline and without an account. If the user is signed in, the
 * newer of (local, remote) wins on load and changes are pushed up, debounced.
 */
export function useAttempt(testId: string) {
  const [attempt, setAttempt] = useState<Attempt>(() => emptyAttempt(testId));
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * The latest state is mirrored into a ref so `update` can read it without
   * persisting from inside a setState updater — React may run updaters twice,
   * which would double-write.
   */
  const latest = useRef<Attempt>(attempt);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const local = readLocalAttempt(testId);
      if (!cancelled) {
        latest.current = local;
        setAttempt(local);
      }

      if (isSupabaseConfigured) {
        const remote = await readRemoteAttempt(testId);
        if (!cancelled && remote && remote.updatedAt > local.updatedAt) {
          latest.current = remote;
          setAttempt(remote);
          writeLocalAttempt(remote);
        }
      }

      if (!cancelled) setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [testId]);

  const persist = useCallback((next: Attempt) => {
    writeLocalAttempt(next);
    if (!isSupabaseConfigured) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    setSyncing(true);
    syncTimer.current = setTimeout(() => {
      void writeRemoteAttempt(next).finally(() => setSyncing(false));
    }, 1200);
  }, []);

  const update = useCallback(
    (mutate: (current: Attempt) => Attempt) => {
      const next = {
        ...mutate(latest.current),
        updatedAt: new Date().toISOString(),
      };
      latest.current = next;
      setAttempt(next);
      persist(next);
    },
    [persist],
  );

  const setAnswer = useCallback(
    (taskId: string, value: AnswerValue) =>
      update((current) => ({
        ...current,
        answers: { ...current.answers, [taskId]: value },
      })),
    [update],
  );

  const setSelfRating = useCallback(
    (taskId: string, rating: SelfRating) =>
      update((current) => ({
        ...current,
        selfAssessment: { ...current.selfAssessment, [taskId]: rating },
      })),
    [update],
  );

  const submitSection = useCallback(
    (kind: SectionKind) =>
      update((current) => ({
        ...current,
        submittedSections: current.submittedSections.includes(kind)
          ? current.submittedSections
          : [...current.submittedSections, kind],
      })),
    [update],
  );

  const reset = useCallback(() => {
    const fresh = { ...emptyAttempt(testId), updatedAt: new Date().toISOString() };
    latest.current = fresh;
    setAttempt(fresh);
    persist(fresh);
  }, [testId, persist]);

  return {
    attempt,
    loaded,
    syncing,
    setAnswer,
    setSelfRating,
    submitSection,
    reset,
  };
}
