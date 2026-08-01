import "server-only";
import { NextResponse } from "next/server";
import { accountsEnabled, ensureIndexes } from "./db";

/** Every route runs on Node: the MongoDB driver does not work on the edge. */
export const nodeRuntime = "nodejs";

export const json = <T>(body: T, status = 200) =>
  NextResponse.json(body, { status });

export const fail = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });

/**
 * Guards every account route.
 *
 * Accounts are optional. If no database is configured the app must still work
 * browser-only, so these endpoints answer politely instead of throwing.
 */
export async function requireAccounts(): Promise<NextResponse | null> {
  if (!accountsEnabled) {
    return NextResponse.json(
      { error: "Konten sind auf diesem Server nicht eingerichtet." },
      { status: 503 },
    );
  }
  await ensureIndexes();
  return null;
}

/** Same shape everywhere, so the client never has to guess. */
export interface MeResponse {
  enabled: boolean;
  user: { id: string; email: string; emailVerified: boolean } | null;
}

/**
 * Body of a request, or an empty object if it is missing or malformed.
 *
 * Returns `Partial<T>` on purpose: everything here comes from the network and
 * has to be validated anyway, so the type should not pretend otherwise.
 */
export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    return {};
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL.test(email) ? email : null;
}

export const MIN_PASSWORD_LENGTH = 8;

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH;
}
