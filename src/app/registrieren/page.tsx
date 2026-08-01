import { redirect } from "next/navigation";

/**
 * Registration is not a separate step any more — /anmelden creates the account
 * if there is none. Kept so older links and bookmarks still work.
 */
export default function RegisterPage() {
  redirect("/anmelden");
}
