import "server-only";
import { ENABLED_COLLECTIONS, OG_PAGES, SITE_NAME, SITE_URL } from "@/constants/site";
import { routing } from "@/i18n/routing";
import { OG_THEME, OgImage } from "@/components/og/OgImage";
import { getCollectionCatalog, getEntry } from "@/lib/articles/source";
import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadIcon, loadOgFonts, OG_FONT_FAMILY } from "./assets";
import {
    coverMime,
    dataUri,
    displayHost,
    entryLogicalPath,
    matchEntry,
    ogPathSegments,
    OG_SIZE,
    parseOgSegments,
    truncate,
} from "./model";

// IO side of the social images (pure rules: lib/og/model.ts). Texts come from the SAME sources as
// the pages' metadata: the messages namespace of OG_PAGES (title + description, else intro) and
// the entry front matter, so the image never drifts from the page.

const TITLE_MAX = 90;
const DESCRIPTION_MAX = 160;

interface OgContent {
    title: string;
    description: string;
    section?: string;
    cover?: string;
}

/** Every (locale, path) to prerender: the OG_PAGES and each served translation of an enabled entry. */
export function ogStaticParams(): { locale: string; path: string[] }[] {
    const params: { locale: string; path: string[] }[] = [];
    for (const locale of routing.locales) {
        for (const href of Object.keys(OG_PAGES)) params.push({ locale, path: ogPathSegments(href) });
        for (const collection of ENABLED_COLLECTIONS) {
            for (const entry of getCollectionCatalog(collection.id)) {
                const translation = entry.translations[locale];
                if (translation) {
                    params.push({
                        locale,
                        path: ogPathSegments(entryLogicalPath(collection.itemHref, translation.slug)),
                    });
                }
            }
        }
    }
    return params;
}

const PUBLIC_ROOT = path.join(process.cwd(), "public");

// Front-matter image (site-absolute, validated by lib/articles/parse.ts) as a data: URI; formats
// Satori cannot draw (webp, avif…) are skipped and the card is drawn without it.
async function loadCover(image: string | undefined): Promise<string | undefined> {
    const mime = image ? coverMime(image) : undefined;
    if (!image || !mime) return undefined;
    const file = path.join(PUBLIC_ROOT, image);
    if (!file.startsWith(PUBLIC_ROOT + path.sep)) return undefined;
    return dataUri(mime, await readFile(file));
}

async function resolveContent(locale: string, logicalPath: string): Promise<OgContent | undefined> {
    const namespace = OG_PAGES[logicalPath];
    if (namespace) {
        const t = await getTranslations({ locale, namespace });
        const description = t.has("description") ? t("description") : t.has("intro") ? t("intro") : "";
        return { title: t("title"), description };
    }
    const match = matchEntry(
        ENABLED_COLLECTIONS.map((c) => c.itemHref),
        logicalPath,
    );
    const collection = ENABLED_COLLECTIONS.find((c) => c.itemHref === match?.itemHref);
    const entry = collection && match ? getEntry(collection.id, locale, match.slug) : undefined;
    if (!collection || !entry) return undefined;
    const article = entry.translations[locale];
    const t = await getTranslations({ locale, namespace: collection.namespace });
    return {
        title: article.title,
        description: article.description,
        section: t("title"),
        cover: await loadCover(article.image),
    };
}

/** The PNG of `/og/<locale>/<segments>`, or a 404 for a path that is not a page. */
export async function ogImageResponse(locale: string, segments: readonly string[]): Promise<Response> {
    const logicalPath = parseOgSegments(segments);
    const served = (routing.locales as readonly string[]).includes(locale);
    const content = served && logicalPath ? await resolveContent(locale, logicalPath) : undefined;
    if (!content) return new Response(null, { status: 404 });

    const [fonts, logo] = await Promise.all([loadOgFonts(), loadIcon()]);
    return new ImageResponse(
        <OgImage
            title={truncate(content.title, TITLE_MAX)}
            description={truncate(content.description, DESCRIPTION_MAX)}
            section={content.section}
            siteName={SITE_NAME}
            host={displayHost(SITE_URL)}
            locale={locale}
            logo={logo}
            cover={content.cover}
            theme={OG_THEME}
            fontFamily={OG_FONT_FAMILY}
        />,
        { ...OG_SIZE, fonts: [...fonts] },
    );
}
