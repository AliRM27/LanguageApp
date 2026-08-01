"use client";

import { useEffect } from "react";
import { mergeLocalAttemptsIntoAccount } from "@/lib/attempt-store";

/**
 * Copies anonymous progress into the account. Renders nothing.
 *
 * Sign-in itself already triggers the merge, so this covers the other case: a
 * page loaded while already signed in, on a browser that has local attempts
 * the account has never seen — a second device, or work done after signing out.
 */
export function AuthSync() {
  useEffect(() => {
    void mergeLocalAttemptsIntoAccount();
  }, []);

  return null;
}
