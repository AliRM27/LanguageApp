import Link from "next/link";
import { AuthStatus } from "./AuthStatus";
import { InterestDialog } from "./InterestDialog";
import { navControl } from "./ui";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      {/*
        Wrapping, because the nav now holds three controls. On a 375px phone the
        brand plus three labels does not fit on one line, and the alternatives —
        shrinking the targets or hiding an entry below a breakpoint — both cost
        more than a second row does. Wide screens are unaffected.
      */}
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="font-semibold text-slate-900">
          Deutsch <span className="text-brand-600">Test Online</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/uebungstests" className={navControl}>
            Übungstests
          </Link>
          <InterestDialog />
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
