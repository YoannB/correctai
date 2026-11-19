// Canonical origin of the site, normalized ONCE at the source (constants/site.ts SITE_URL): every
// consumer (robots.txt, sitemap, canonical, og:url, hreflang) either concatenates `${SITE_URL}/…`
// or resolves with `new URL(path, SITE_URL)`, so a trailing slash in NEXT_PUBLIC_SITE_URL
// ("https://example.com/") must never reach them (`https://example.com//sitemap.xml`).
export const DEFAULT_SITE_URL = "http://localhost:3000";

export function normalizeSiteUrl(raw: string | undefined): string {
    const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
    return trimmed || DEFAULT_SITE_URL;
}
