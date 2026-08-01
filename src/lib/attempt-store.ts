"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAttempt,
  getMe,
  importAttempts,
  saveAttempt,
  type AttemptPayload,
} from "./api";
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
const KEY_PREFIX = "uebungstest:attempt:";

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

export function readAllLocalAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  const all: Attempt[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(KEY_PREFIX)) continue;
    try {
      all.push(JSON.parse(window.localStorage.getItem(key)!) as Attempt);
    } catch {
      // Corrupt entry — skip it rather than lose the rest.
    }
  }
  return all;
}

export function clearAllLocalAttempts() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(KEY_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Nothing was stored here anyway.
  }
}

/* -------------------------------- syncing --------------------------------- */

const toPayload = (attempt: Attempt): AttemptPayload => ({
  testId: attempt.testId,
  answers: attempt.answers as Record<string, unknown>,
  selfAssessment: attempt.selfAssessment,
  submittedSections: attempt.submittedSections,
  updatedAt: attempt.updatedAt,
});

/**
 * Moves whatever this browser did anonymously into the account.
 *
 * Without this, a learner who works through three tests and *then* signs up
 * finds an empty account: progress is only pushed when something changes, and a
 * finished test is never touched again. Signing up would look like losing
 * everything.
 */
export async function mergeLocalAttemptsIntoAccount(): Promise<number> {
  const me = await getMe();
  if (!me.enabled || !me.user) return 0;

  const local = readAllLocalAttempts().filter(
    (a) => a.submittedSections?.length || Object.keys(a.answers ?? {}).length,
  );
  if (local.length === 0) return 0;

  const result = await importAttempts(local.map(toPayload));
  return result.ok ? result.data.imported : 0;
}

/* --------------------------------- hook ---------------------------------- */

/**
 * Local-first: state is written to localStorage synchronously, so a test keeps
 * working offline and without an account. When signed in, the server copy is
 * loaded on mount if it is newer, and changes are pushed up debounced.
 */
export function useAttempt(testId: string) {
  const [attempt, setAttempt] = useState<Attempt>(() => emptyAttempt(testId));
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signedIn = useRef(false);

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

      const me = await getMe();
      signedIn.current = Boolean(me.enabled && me.user);

      if (signedIn.current) {
        const result = await fetchAttempt(testId);
        const remote = result.ok ? result.data.attempt : null;

        if (!cancelled && remote && remote.updatedAt > local.updatedAt) {
          const merged: Attempt = {
            testId,
            answers: remote.answers as Answers,
            selfAssessment: remote.selfAssessment as SelfAssessment,
            submittedSections: remote.submittedSections as SectionKind[],
            updatedAt: remote.updatedAt,
          };
          latest.current = merged;
          setAttempt(merged);
          writeLocalAttempt(merged);
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
    if (!signedIn.current) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    setSyncing(true);
    syncTimer.current = setTimeout(() => {
      void saveAttempt(next.testId, {
        answers: next.answers as Record<string, unknown>,
        selfAssessment: next.selfAssessment,
        submittedSections: next.submittedSections,
        updatedAt: next.updatedAt,
      }).finally(() => setSyncing(false));
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
