"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMe, type Me } from "@/lib/api";

export function AuthStatus() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    void getMe().then(setMe);
  }, []);

  // Nothing until we know: a link that flips from "Anmelden" to "Mein Bereich"
  // a moment after load is worse than a brief gap.
  if (!me?.enabled) return null;

  return (
    <Link
      href={me.user ? "/mein-bereich" : "/anmelden"}
      className="text-brand-600 hover:underline"
    >
      {me.user ? "Mein Bereich" : "Anmelden"}
    </Link>
  );
}
