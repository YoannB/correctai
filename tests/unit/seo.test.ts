// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Article, ArticleEntry } from "@/lib/articles/parse";

const SITE_URL = vi.hoisted(() => "https://example.com");

const routing = vi.hoisted(() => ({
    locales: ["en", "fr"],
    defaultLocale: "en",
}));

type Href = string | { pathname: string; params: { slug: string } };

const getPathname = vi.hoisted(() => ({ locale, href }: { locale: string; href: Href }) => {
    const path = typeof href === "string" ? href : href.pathname.replace("[slug]", href.params.slug);
    if (locale === routing.defaultLocale) {
        return path;
    }

    return path === "/" ? `/${locale}` : `/${locale}${path}`;
});

vi.mock("@/constants/site", () => ({
    SITE_URL,
    SITE_NAME: "Site",
    // Pages with their own social image (constants/site.ts OG_PAGES); "/about" has none.
    OG_PAGES: { "/": "meta.home", "/sitemap": "pages.sitemap", "/legal": "pages.legal" },
}));

vi.mock("@/i18n/routing", () => ({
    routing,
    getPathname,
}));

import { articleJsonLd, articleMetadata, articlePath, pageMetadata } from "@/lib/seo";

describe("pageMetadata — base metadata", () => {
    it("returns the given title and description", () => {
        const metadata = pageMetadata({ title: "Titre", description: "Description", href: "/", locale: "en" });

        expect(metadata.title).toBe("Titre");
        expect(metadata.description).toBe("Description");
    });
});

describe("pageMetadata — canonical", () => {
    it("points to the default locale URL on the default page", () => {
        const metadata = pageMetadata({ title: "Legal", description: "Legal page", href: "/legal", locale: "en" });

        expect(metadata.alternates?.canonical).toBe("https://example.com/legal");
    });

    it("points to ITS locale URL on a translation (not to the default locale)", () => {
        const metadata = pageMetadata({ title: "Légal", description: "Mentions", href: "/legal", locale: "fr" });

        expect(metadata.alternates?.canonical).toBe("https://example.com/fr/legal");
    });

    it("normalizes the root with a trailing slash", () => {
        const metadata = pageMetadata({ title: "Home", description: "Home page", href: "/", locale: "en" });

        expect(metadata.alternates?.canonical).toBe("https://example.com/");
    });
});

describe("pageMetadata — hreflang", () => {
    it("adds one entry per configured locale", () => {
        const metadata = pageMetadata({
            title: "Privacy",
            description: "Privacy page",
            href: "/privacy",
            locale: "en",
        });

        expect(metadata.alternates?.languages).toMatchObject({
            en: "https://example.com/privacy",
            fr: "https://example.com/fr/privacy",
        });
    });

    it("adds x-default aligned with the default locale, whatever the page", () => {
        const metadata = pageMetadata({
            title: "Cookies",
            description: "Cookies page",
            href: "/cookies",
            locale: "fr",
        });

        expect(metadata.alternates?.languages?.["x-default"]).toBe("https://example.com/cookies");
    });

    it("does not produce a double slash on the localized root", () => {
        const metadata = pageMetadata({ title: "Home", description: "Home page", href: "/", locale: "en" });

        expect(metadata.alternates?.languages).toEqual({
            en: "https://example.com/",
            fr: "https://example.com/fr",
            "x-default": "https://example.com/",
        });
    });
});

describe("pageMetadata — OpenGraph", () => {
    it("duplicates the page's title, description, canonical URL, type and locale", () => {
        const metadata = pageMetadata({ title: "Plan", description: "Plan du site", href: "/sitemap", locale: "fr" });

        expect(metadata.openGraph).toMatchObject({
            title: "Plan",
            description: "Plan du site",
            url: "https://example.com/fr/sitemap",
            type: "website",
            locale: "fr",
        });
    });
});

describe("pageMetadata — social image", () => {
    it("points og:image to the page's own absolute PNG in its locale, 1200x630, alt = localized title", () => {
        const metadata = pageMetadata({ title: "Plan", description: "Plan du site", href: "/sitemap", locale: "fr" });

        expect(metadata.openGraph?.images).toEqual([
            {
                url: "https://example.com/og/fr/sitemap.png",
                width: 1200,
                height: 630,
                alt: "Plan",
                type: "image/png",
            },
        ]);
    });

    it("uses the same image for a Twitter large card", () => {
        const metadata = pageMetadata({ title: "Legal", description: "Legal page", href: "/legal", locale: "en" });

        expect(metadata.twitter).toEqual({
            card: "summary_large_image",
            title: "Legal",
            description: "Legal page",
            images: [{ url: "https://example.com/og/en/legal.png", alt: "Legal", width: 1200, height: 630 }],
        });
    });

    it("names the home image index.png", () => {
        const metadata = pageMetadata({ title: "Accueil", description: "Accueil", href: "/", locale: "fr" });

        expect(metadata.openGraph?.images).toMatchObject([{ url: "https://example.com/og/fr/index.png" }]);
    });

    it("shares the home image (alt = site name) for a page without its own", () => {
        // A page not listed in OG_PAGES ("/about" is not a key of the routing types).
        const metadata = pageMetadata({ title: "About", description: "About", href: "/about" as "/", locale: "fr" });

        expect(metadata.openGraph?.images).toMatchObject([{ url: "https://example.com/og/fr/index.png", alt: "Site" }]);
        expect(metadata.twitter).toMatchObject({
            images: [{ url: "https://example.com/og/fr/index.png", alt: "Site" }],
        });
    });
});

const article = (locale: string, slug: string, extra: Partial<Article> = {}): Article => ({
    id: "demo",
    locale,
    slug,
    title: `Title ${locale}`,
    description: `Description ${locale}`,
    date: "2026-11-10",
    body: "Body",
    ...extra,
});

const BOTH: ArticleEntry = {
    id: "demo",
    translations: { en: article("en", "hello", { image: "/articles/demo/cover.png" }), fr: article("fr", "bonjour") },
};
const FR_ONLY: ArticleEntry = { id: "demo", translations: { fr: article("fr", "bonjour") } };

describe("articlePath", () => {
    it("builds the localized path with the translated slug", () => {
        expect(articlePath("fr", "bonjour")).toBe("/fr/articles/bonjour");
        expect(articlePath("en", "hello")).toBe("/articles/hello");
    });
});

describe("articleMetadata", () => {
    it("canonical = URL of the displayed translation, hreflang = existing translations", () => {
        const metadata = articleMetadata(BOTH, "fr");

        expect(metadata.alternates).toEqual({
            canonical: "https://example.com/fr/articles/bonjour",
            languages: {
                en: "https://example.com/articles/hello",
                fr: "https://example.com/fr/articles/bonjour",
                "x-default": "https://example.com/articles/hello",
            },
        });
        expect(metadata.title).toBe("Title fr");
        expect(metadata.description).toBe("Description fr");
    });

    it("x-default falls back to the page itself without a translation in the default locale", () => {
        const metadata = articleMetadata(FR_ONLY, "fr");

        expect(metadata.alternates?.languages).toEqual({
            fr: "https://example.com/fr/articles/bonjour",
            "x-default": "https://example.com/fr/articles/bonjour",
        });
    });

    it("OpenGraph of type article, with date and the entry's own generated image", () => {
        expect(articleMetadata(BOTH, "en").openGraph).toEqual({
            title: "Title en",
            description: "Description en",
            url: "https://example.com/articles/hello",
            type: "article",
            locale: "en",
            publishedTime: "2026-11-10",
            images: [
                {
                    url: "https://example.com/og/en/articles/hello.png",
                    width: 1200,
                    height: 630,
                    alt: "Title en",
                    type: "image/png",
                },
            ],
        });
    });

    it("the image follows the translation's slug and the collection's entry route", () => {
        const metadata = articleMetadata(BOTH, "fr", "/reminders/[slug]" as "/articles/[slug]");

        expect(metadata.openGraph?.images).toMatchObject([
            { url: "https://example.com/og/fr/reminders/bonjour.png", alt: "Title fr" },
        ]);
        expect(metadata.twitter).toMatchObject({
            card: "summary_large_image",
            images: [{ url: "https://example.com/og/fr/reminders/bonjour.png" }],
        });
    });
});

describe("articleJsonLd", () => {
    it("serializes a BlogPosting with URL, language and image", () => {
        expect(JSON.parse(articleJsonLd(BOTH, "en", "Site"))).toEqual({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: "Title en",
            description: "Description en",
            datePublished: "2026-11-10",
            inLanguage: "en",
            url: "https://example.com/articles/hello",
            mainEntityOfPage: "https://example.com/articles/hello",
            publisher: { "@type": "Organization", name: "Site" },
            image: "https://example.com/articles/demo/cover.png",
        });
    });

    it("omits the missing image and escapes < so it never closes the script tag", () => {
        const entry: ArticleEntry = {
            id: "demo",
            translations: { fr: article("fr", "bonjour", { title: "</script><b>" }) },
        };
        const json = articleJsonLd(entry, "fr", "Site");

        expect(json).not.toContain("<");
        expect(JSON.parse(json).headline).toBe("</script><b>");
        expect(JSON.parse(json)).not.toHaveProperty("image");
    });
});
