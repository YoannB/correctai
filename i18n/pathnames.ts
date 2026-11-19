// Localized routes of the app (logical key → one path, or one path per locale), used by
// i18n/routing.ts. Kept out of routing.ts (which pulls next-intl/navigation, so next/navigation) so
// plain Node code — Playwright specs — can resolve localized paths too.
export const PATHNAMES = {
    "/": "/",
    "/sitemap": {
        fr: "/plan-du-site",
        en: "/sitemap",
        es: "/mapa-del-sitio",
        de: "/sitemap",
        it: "/mappa-del-sito",
        pt: "/mapa-do-site",
    },
    "/legal": {
        fr: "/mentions-legales",
        en: "/legal",
        es: "/aviso-legal",
        de: "/impressum",
        it: "/note-legali",
        pt: "/aviso-legal",
    },
    "/privacy": {
        fr: "/confidentialite",
        en: "/privacy",
        es: "/privacidad",
        de: "/datenschutz",
        it: "/privacy",
        pt: "/privacidade",
    },
    "/articles": {
        fr: "/articles",
        en: "/articles",
        es: "/articulos",
        de: "/artikel",
        it: "/articoli",
        pt: "/artigos",
    },
    // [slug] = the TRANSLATED slug of the article (front matter), different per locale.
    "/articles/[slug]": {
        fr: "/articles/[slug]",
        en: "/articles/[slug]",
        es: "/articulos/[slug]",
        de: "/artikel/[slug]",
        it: "/articoli/[slug]",
        pt: "/artigos/[slug]",
    },
    "/cookies": {
        fr: "/cookies",
        en: "/cookies",
        es: "/cookies",
        de: "/cookies",
        it: "/cookies",
        pt: "/cookies",
    },
} as const;

/** Logical key of a STATIC route of `P` (no dynamic `[param]` segment). */
export type StaticHref<P> = Exclude<Extract<keyof P, string>, `${string}[${string}`>;

/** Logical keys of the STATIC routes (no dynamic `[param]` segment), in declaration order. */
export function staticHrefs<P extends Readonly<Record<string, unknown>>>(pathnames: P): StaticHref<P>[] {
    return Object.keys(pathnames).filter((href) => !href.includes("[")) as StaticHref<P>[];
}
