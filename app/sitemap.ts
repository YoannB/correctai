import { ARTICLES_ENABLED, SITE_URL } from "@/constants/site";
import { getPathname, routing } from "@/i18n/routing";
import { getCatalog } from "@/lib/articles/source";
import { articlePath, type LogicalHref } from "@/lib/seo";
import type { MetadataRoute } from "next";

const HREFS: LogicalHref[] = (["/", "/articles", "/sitemap", "/legal", "/privacy", "/cookies"] as const).filter(
    (href) => ARTICLES_ENABLED || href !== "/articles",
);

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    const pages = HREFS.flatMap((href) =>
        routing.locales.map((locale) => ({
            url: new URL(getPathname({ locale, href }), SITE_URL).toString(),
            lastModified: now,
            changeFrequency: href === "/" || href === "/articles" ? ("weekly" as const) : ("monthly" as const),
            priority: href === "/" ? 1 : 0.6,
        })),
    );
    // One entry per article TRANSLATION (served locales only), dated by its front matter.
    const articles = (ARTICLES_ENABLED ? getCatalog() : []).flatMap((entry) =>
        Object.values(entry.translations).map((article) => ({
            url: new URL(articlePath(article.locale, article.slug), SITE_URL).toString(),
            lastModified: new Date(`${article.date}T00:00:00Z`),
            changeFrequency: "yearly" as const,
            priority: 0.7,
        })),
    );
    return [...pages, ...articles];
}
