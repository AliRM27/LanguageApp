"use client";

import type { StartResult } from "@/app/api/auth/start/route";
import type { AttemptPayload } from "@/app/api/attempts/route";

/**
 * The browser's view of our own backend.
 *
 * Everything goes through same-origin fetch with the session cookie, so there
 * are no tokens to store in the page and nothing to leak through XSS.
 */

export type { StartResult, AttemptPayload };

export interface Me {
  enabled: boolean;
  user: { id: string; email: string; emailVerified: boolean } | null;
}

async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "same-origin",
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          typeof body?.error === "string"
            ? body.error
            : "Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.",
      };
    }
    return { ok: true, data: body as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Keine Verbindung zum Server. Sind Sie online?",
    };
  }
}

/* ---------------------------------- auth ---------------------------------- */

let mePromise: Promise<Me> | null = null;

/** Cached for the lifetime of the page; `forgetMe()` after any auth change. */
export function getMe(): Promise<Me> {
  if (!mePromise) {
    mePromise = call<Me>("/api/auth/me").then((result) =>
      result.ok ? result.data : { enabled: false, user: null },
    );
  }
  return mePromise;
}

export function forgetMe() {
  mePromise = null;
}

export const authStart = (email: string, password: string) =>
  call<StartResult>("/api/auth/start", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const authLogout = () => call<{ ok: true }>("/api/auth/logout", { method: "POST" });

export const requestPasswordReset = (email: string) =>
  call<{ ok: true }>("/api/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token: string, password: string) =>
  call<{ ok: true }>("/api/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

export const deleteAccount = () =>
  call<{ ok: true }>("/api/account", { method: "DELETE" });

/* -------------------------------- attempts -------------------------------- */

export const fetchAttempts = () =>
  call<{ attempts: AttemptPayload[] }>("/api/attempts");

export const fetchAttempt = (testId: string) =>
  call<{ attempt: AttemptPayload | null }>(
    `/api/attempts/${encodeURIComponent(testId)}`,
  );

export const saveAttempt = (testId: string, attempt: Omit<AttemptPayload, "testId">) =>
  call<{ ok: true }>(`/api/attempts/${encodeURIComponent(testId)}`, {
    method: "PUT",
    body: JSON.stringify(attempt),
  });

export const importAttempts = (list: AttemptPayload[]) =>
  call<{ imported: number }>("/api/attempts", {
    method: "POST",
    body: JSON.stringify({ attempts: list }),
  });
