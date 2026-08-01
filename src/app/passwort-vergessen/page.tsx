import type { Metadata } from "next";
import { ResetRequestForm } from "@/components/auth/ResetRequestForm";

export const metadata: Metadata = {
  title: "Passwort vergessen",
  description: "Setzen Sie Ihr Passwort mit einem Link per E-Mail zurück.",
};

export default function ForgotPasswordPage() {
  return <ResetRequestForm />;
}
