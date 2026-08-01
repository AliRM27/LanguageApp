import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export const metadata: Metadata = {
  title: "Neues Passwort",
  robots: { index: false },
};

export default function NewPasswordPage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-sm text-slate-500">Wird geladen …</p>
      }
    >
      <NewPasswordForm />
    </Suspense>
  );
}
