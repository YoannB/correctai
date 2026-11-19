import { COLLECTIONS, HIDDEN_HREFS, SITE_URL } from "@/constants/site";
import { staticHrefs } from "@/i18n/pathnames";
import { getPathname, routing } from "@/i18n/routing";
import { getCollectionCatalog } from "@/lib/articles/source";
import { entryPath, type EntryHref, type LogicalHref } from "@/lib/seo";
import type { MetadataRoute } from "next";

// Every STATIC route of routing.pathnames, minus the routes of
// disabled collections. Collection listings change weekly, like the home.
const HREFS: LogicalHref[] = staticHrefs(routing.pathnames).filter((href) => !HIDDEN_HREFS.includes(href));
const ENABLED = COLLECTIONS.filter((c) => c.enabled);
const WEEKLY: readonly string[] = ["/", ...ENABLED.map((c) => c.href)];

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    const pages = HREFS.flatMap((href) =>
        routing.locales.map((locale) => ({
            url: new URL(getPathname({ locale, href }), SITE_URL).toString(),
            lastModified: now,
            changeFrequency: WEEKLY.includes(href) ? ("weekly" as const) : ("monthly" as const),
            priority: href === "/" ? 1 : 0.6,
        })),
    );
    // One entry per TRANSLATION of every enabled collection (served locales only), dated by its
    // front matter. The articles come first (declaration order).
    const entries = ENABLED.flatMap((collection) =>
        getCollectionCatalog(collection.id).flatMap((entry) =>
            Object.values(entry.translations).map((article) => ({
                url: new URL(
                    entryPath(collection.itemHref as EntryHref, article.locale, article.slug),
                    SITE_URL,
                ).toString(),
                lastModified: new Date(`${article.date}T00:00:00Z`),
                changeFrequency: "yearly" as const,
                priority: 0.7,
            })),
        ),
    );
    return [...pages, ...entries];
}
