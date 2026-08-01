import Link from "next/link";
import { AuthStatus } from "./AuthStatus";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-semibold text-slate-900">
          Deutsch <span className="text-brand-600">Übungstests</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/uebungstests" className="text-slate-600 hover:text-slate-900">
            Übungstests
          </Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
