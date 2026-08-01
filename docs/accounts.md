# Accounts

Our own auth, in this app. No third-party auth service.

Optional: with no `MONGODB_URI` the login disappears and progress stays in the
browser. Every test works either way.

## How it fits together

```
browser  ──fetch──>  /api/auth/*      ──>  MongoDB   (users, sessions, tokens)
                     /api/attempts/*  ──>  MongoDB   (attempts)
                     └─ session cookie, httpOnly
```

No separate server: the API lives in the same Next.js app as the pages, so
there is one deploy, no CORS, and the types are shared between the two sides.

## Signing in

**One form does both.** A learner types an e-mail and a password at
`/anmelden`; `POST /api/auth/start` decides what that means:

| situation | what happens |
|---|---|
| account exists, password correct, verified | signed in |
| account exists, password correct, unverified | verification e-mail sent again |
| account exists, password wrong | told the password is wrong |
| no account | created, verification e-mail sent |

There is no separate sign-up page — `/registrieren` redirects to `/anmelden`.

Clicking the link in the e-mail confirms the address **and** signs the learner
in, because asking someone to confirm and then log in again is a pointless step.

## Security decisions worth knowing

**Passwords** use scrypt from Node's standard library — memory-hard, and with
no native dependency that could fail to compile on a deploy. Parameters are
stored with each hash (`scrypt$N$r$p$salt$hash`) so they can be raised later
without invalidating anyone's password.

**Sessions are opaque random tokens, stored hashed.** A JWT would avoid a
database lookup but cannot be revoked, and this app needs revocation for
sign-out, password reset and account deletion. Only the SHA-256 of the token is
stored, so a database dump does not hand over working sessions.

**Links in e-mail are single-use and expire in an hour**, also stored hashed. A
new reset link invalidates the previous one.

**Password reset drops every session** for that user. Whoever knew the old
password must not stay signed in on their own device.

**Timing is levelled.** Signing in with an unknown address runs a dummy hash so
it takes about as long as a wrong password. Forgot-password always answers the
same way whether or not the address exists. Both prevent the forms being used
to discover who has an account.

**Rate limits are counted in MongoDB**, not in memory: serverless spreads
requests across containers, so an in-memory counter would effectively be
per-container. 10 sign-in attempts per address per 15 minutes, 30 per IP, and 3
password-reset requests per address.

## Setting it up

**1. MongoDB Atlas** — create a free M0 cluster, ideally in an EU region so
learner data stays in the EU. Add a database user, and under Network Access
allow `0.0.0.0/0` (serverless has no fixed IP; the connection is still
password-protected and TLS-encrypted).

**2. `.env.local`** — copy `.env.example` and set `MONGODB_URI`. Indexes are
created automatically on first use; there is no migration step.

**3. Try it without e-mail.** Run `npm run dev`, sign up, and the confirmation
link appears **in the terminal** rather than being sent. That is enough to test
the whole flow before setting up a mail provider.

**4. E-mail for real** — sign up at [resend.com](https://resend.com), verify a
domain, and set `RESEND_API_KEY` and `MAIL_FROM`. The free tier is 3,000
messages a month; your mother's classes will use a handful a week.

Without these two variables the app logs instead of sending in development, and
returns a clear error in production rather than silently doing nothing.

## Testing it

1. `npm run dev` and do a test or two **without** signing in.
2. Sign up. Copy the link from the terminal and open it.
3. "Mein Bereich" should list the work you did anonymously — this is the step
   worth checking carefully, it is the one that silently did nothing before.
4. Open a private window, sign in as the same person: the same results appear.
5. Use "Passwort vergessen", set a new password, confirm you are signed out
   everywhere and the new password works.
6. Delete the account and confirm both the database and the page are empty.

## Data stored

`users` (e-mail, password hash, verified flag), `sessions`, `tokens` and
`attempts` (answers, self-assessment, submitted sections). No names, no
tracking, no teacher view — a learner can only ever reach their own rows,
because every query is scoped by the session's user id on the server.
