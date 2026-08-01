"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured || !ready) return null;

  if (!email) {
    return (
      <Link href="/anmelden" className="text-brand-600 hover:underline">
        Anmelden
      </Link>
    );
  }

  return (
    <Link href="/mein-bereich" className="text-brand-600 hover:underline">
      Mein Bereich
    </Link>
  );
}
