import type { Metadata } from "next";
import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = {
  title: "Anmelden",
  description:
    "Melden Sie sich an, um Ihren Fortschritt auf allen Geräten zu speichern.",
};

export default function SignInPage() {
  return <SignInForm />;
}
