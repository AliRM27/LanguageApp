import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Search engines are welcome on the content and nowhere else.
 *
 * `/api/` matters more than it looks: the confirmation and password-reset links
 * are GET requests, and a crawler that followed one out of an e-mail preview
 * would burn a single-use token before the learner ever clicked it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/mein-bereich",
        "/anmelden",
        "/registrieren",
        "/passwort-vergessen",
        "/passwort-neu",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
