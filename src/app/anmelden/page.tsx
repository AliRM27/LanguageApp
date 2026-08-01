import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = {
  title: "Anmelden",
  description:
    "Melden Sie sich an, um Ihren Fortschritt auf allen Geräten zu speichern.",
};

export default function SignInPage() {
  // The form reads ?fehler= from the URL, which needs a Suspense boundary
  // for this page to stay statically rendered.
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-sm text-slate-500">Wird geladen …</p>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
