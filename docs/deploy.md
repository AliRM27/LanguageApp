# Going live

The free launch: no payments, no Gewerbe, no tax registration — none of that is
needed until money changes hands. What *is* needed is a domain, a working
Impressum, and about an hour.

Work through it in order; each step depends on the one before.

---

## 1. The domain — done

**deutschtestonline.de** is the site. The brand name in the app now matches it:
*Deutsch Test Online*.

If you also registered the `.com`, it does **not** serve the site — it makes a
permanent redirect to the `.de`. Serving both would be duplicate content and
Google would pick one at random. Vercel does this for you in step 6.

## 2. Impressum — done, with one thing left

`src/lib/site.ts` has the real details, so `npm run check:release` passes.

One item outstanding: the contact address is still a Gmail one. That is legally
acceptable — § 5 DDG asks for a way to reach you quickly, not for a particular
provider — but you need a mailbox on the domain for step 4 anyway, so create
`kontakt@deutschtestonline.de` and swap it in. Do **not** put an address there
before the mailbox exists: an unreachable contact in an Impressum is worse than
a Gmail one.

## 3. MongoDB Atlas — check the region

Free M0 cluster, **in an EU region** (e.g. Frankfurt `eu-central-1`). The
privacy notice says the data stays in the EU, so this has to be true. Moving
later means migrating live data.

Under *Network Access* allow `0.0.0.0/0`. Serverless functions have no fixed IP;
the connection is still password-protected and TLS-encrypted.

Copy the connection string for step 6.

## 4. Resend — verify the domain

Sign up at [resend.com](https://resend.com), add your domain, and put the DNS
records it gives you (SPF, DKIM, and DMARC if offered) at your registrar.
Verification usually takes minutes; DNS can take a few hours.

Until this is verified, confirmation e-mails cannot be sent, so nobody can
finish signing up.

Then set `MAIL_FROM` to an address **on that domain** — e.g.
`Deutsch Test Online <noreply@deutschtestonline.de>`. A `gmail.com` sender will not
work and will land in spam.

## 5. Push to GitHub

If the repository is not on GitHub yet:

```bash
git add -A
git commit -m "Launch: legal pages, metadata, sitemap"
gh repo create deutschtestonline --private --source=. --push
```

Keep it **private**. The test content is the thing of value here, and it will be
behind a paywall later.

## 6. Deploy on Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). Next.js is
detected automatically; no build settings to change.

Add the environment variables (Settings → Environment Variables), for
Production *and* Preview:

| Name | Value |
|---|---|
| `MONGODB_URI` | the Atlas connection string from step 3 |
| `MONGODB_DB` | `uebungstests` |
| `NEXT_PUBLIC_SITE_URL` | `https://deutschtestonline.de` — no trailing slash |
| `RESEND_API_KEY` | from step 4 |
| `MAIL_FROM` | `Deutsch Test Online <noreply@deutschtestonline.de>` |
| `MAIL_REPLY_TO` | `kontakt@deutschtestonline.de` — once it receives mail |

`GOOGLE_TTS_API_KEY` is **not** needed here. Audio is generated on your laptop
and committed as files; the server never calls Google.

Then Settings → Domains:

1. Add `deutschtestonline.de` and follow the DNS instructions.
2. Add `www.deutschtestonline.de` — Vercel redirects it to the bare domain.
3. If you bought the `.com`, add it too and set it to **Redirect to
   deutschtestonline.de** rather than serving it.

> **Add the environment variables before the first deployment, not after.**
>
> `NEXT_PUBLIC_SITE_URL` is not read per request — it is baked into the build.
> The sitemap, robots.txt, every canonical tag and the og:image URL are all
> generated once, at build time, from that value. Changing it in the dashboard
> later does nothing until you trigger a **new deployment**.
>
> Get this wrong and nothing looks broken: the site works perfectly while
> telling Google it lives on `localhost:3000` and sending confirmation links to
> a host that does not exist. The build now refuses rather than let that ship,
> and `check:release` fails on any build server if the value is missing, not
> `https://`, or has a trailing slash.

## 7. Before you tell anyone

Run locally first:

```bash
npm run preflight
```

That runs the typecheck, validates all 18 tests, runs the release checks
(Impressum filled in, every link resolves, all 54 audio files present) and then
the production build. All four must pass.

Then, **on the real domain, not localhost**:

- [ ] Do a test without signing in. Answers survive a page reload.
- [ ] Sign up with a real address. The e-mail arrives (check spam).
- [ ] Click the link. The **original tab** moves on by itself.
- [ ] "Mein Bereich" shows the test you did before signing in.
- [ ] Sign in on your phone. The same results are there.
- [ ] Play a Hören file on the phone, on mobile data.
- [ ] "Passwort vergessen" — new password works, old sessions are gone.
- [ ] Delete the account. It disappears from Atlas.
- [ ] Paste the link into WhatsApp. The preview image shows.
- [ ] Open `/impressum` and `/datenschutz`. No warning banner.

## 8. Tell Google it exists

In [Search Console](https://search.google.com/search-console), add the domain,
verify by DNS, and submit `https://deutschtestonline.de/sitemap.xml`.

Indexing takes days to weeks. Nothing to do but wait.

---

## What is deliberately not here yet

**Payments.** See the notes in the conversation — an MoR (Paddle) rather than
Stripe direct, because selling worldwide otherwise means VAT registration in a
lot of countries. Before that can happen: Gewerbe, a Steuerberater on the
freiberuflich-vs-gewerblich question, AGB, Widerrufsbelehrung, a
Kündigungsbutton (§ 312k BGB) and a Widerrufsbutton (§ 356a BGB, mandatory
since 19 June 2026).

**A real paywall.** Today all content is statically generated and the audio sits
at guessable public URLs, so gating in the UI alone would be decorative. Paid
tests have to move behind an authenticated route and audio behind signed URLs.
This is the largest single piece of work remaining and is independent of the
payment provider.

**Analytics.** When you want them, Vercel Analytics or Plausible — both
cookieless, so no consent banner and no change to the privacy notice beyond
naming the processor.

**An English entry point.** The test UI should stay German (learners of German
should read German), but someone arriving from outside Germany may need an
English page explaining what this is.
