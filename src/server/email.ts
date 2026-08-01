import "server-only";

/**
 * Sending e-mail, with a fallback that needs no provider.
 *
 * Without RESEND_API_KEY the message is written to the server log instead of
 * being sent. That means the whole sign-up and password-reset flow can be
 * developed and tested locally without signing up for anything — copy the link
 * out of the terminal. In production the missing key is a real error, so it is
 * reported rather than silently swallowed.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendResult =
  | { ok: true; delivered: boolean }
  | { ok: false; error: string };

export async function sendMail(mail: Mail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error: "RESEND_API_KEY oder MAIL_FROM ist nicht gesetzt",
      };
    }
    console.log(
      [
        "",
        "──────── E-Mail (nicht verschickt, nur Entwicklung) ────────",
        `An:      ${mail.to}`,
        `Betreff: ${mail.subject}`,
        "",
        mail.text,
        "────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, delivered: false };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `Resend ${response.status}: ${await response.text()}` };
    }
    return { ok: true, delivered: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/* -------------------------------- templates ------------------------------- */

const layout = (heading: string, body: string) => `
<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#0f172a">
  <h2 style="margin:0 0 12px">${heading}</h2>
  ${body}
  <p style="margin-top:24px;font-size:12px;color:#64748b">
    Deutsch Übungstests
  </p>
</div>`;

const button = (url: string, label: string) => `
  <p style="margin:20px 0">
    <a href="${url}" style="background:#3149b0;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
      ${label}
    </a>
  </p>
  <p style="font-size:13px;color:#475569">
    Falls der Knopf nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:<br>
    <span style="word-break:break-all">${url}</span>
  </p>`;

export function verifyEmailMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Bitte bestätigen Sie Ihre E-Mail-Adresse",
    html: layout(
      "Willkommen bei Deutsch Übungstests",
      `<p>Bitte bestätigen Sie Ihre E-Mail-Adresse. Danach sind Sie angemeldet.</p>
       ${button(url, "E-Mail-Adresse bestätigen")}
       <p style="font-size:13px;color:#475569">Der Link gilt eine Stunde.
       Wenn Sie sich nicht angemeldet haben, können Sie diese E-Mail löschen.</p>`,
    ),
    text: [
      "Willkommen bei Deutsch Übungstests",
      "",
      "Bitte bestätigen Sie Ihre E-Mail-Adresse:",
      url,
      "",
      "Der Link gilt eine Stunde.",
      "Wenn Sie sich nicht angemeldet haben, können Sie diese E-Mail löschen.",
    ].join("\n"),
  };
}

export function resetPasswordMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Neues Passwort für Deutsch Übungstests",
    html: layout(
      "Neues Passwort",
      `<p>Klicken Sie auf den Knopf, um ein neues Passwort zu wählen.</p>
       ${button(url, "Neues Passwort setzen")}
       <p style="font-size:13px;color:#475569">Der Link gilt eine Stunde.
       Wenn Sie das nicht wollten, ignorieren Sie diese E-Mail –
       Ihr Passwort bleibt dann unverändert.</p>`,
    ),
    text: [
      "Neues Passwort",
      "",
      "Klicken Sie auf den Link, um ein neues Passwort zu wählen:",
      url,
      "",
      "Der Link gilt eine Stunde.",
      "Wenn Sie das nicht wollten, ignorieren Sie diese E-Mail.",
    ].join("\n"),
  };
}

/** Absolute URL for links in e-mail, which cannot be relative. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
