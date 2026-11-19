// PURE module (no next-intl, no fs, no process.env): the social image (Open Graph / Twitter card)
// of every page — its URL scheme, the text fitting rules and the props of the image component
// (components/og/OgImage.tsx). The IO side (fonts, logo, cover, messages) is lib/og/render.tsx; the route is
// app/og/[locale]/[...path]/route.tsx. Guide: docs/seo-layout.md → Social images.
/** Size of every social image: the 1.91:1 card of Open Graph and Twitter `summary_large_image`. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Image of a page = `/og/<locale><logical path>.png`, the home being `/og/<locale>/index.png`.
 * The LOGICAL path is the route key ("/legal", "/articles/<slug>"), never the localized one, so
 * the URL is stable across translations of a pathname. The ".png" dot keeps the route out of the
 * locale middleware (its matcher skips every path containing a dot).
 */
export const OG_ROOT = "/og";
const HOME_FILE = "index";
const EXT = ".png";

/** "/" → ["index.png"], "/legal" → ["legal.png"], "/articles/a-b" → ["articles", "a-b.png"]. */
export function ogPathSegments(logicalPath: string): string[] {
    const parts = logicalPath.split("/").filter(Boolean);
    if (parts.length === 0) return [`${HOME_FILE}${EXT}`];
    return [...parts.slice(0, -1), `${parts.at(-1)}${EXT}`];
}

/** Site-absolute path of the image of `logicalPath` in `locale`. */
export function ogImagePath(locale: string, logicalPath: string): string {
    return [OG_ROOT, locale, ...ogPathSegments(logicalPath)].join("/");
}

/** Inverse of ogPathSegments; undefined when the last segment is not a ".png" file. */
export function parseOgSegments(segments: readonly string[]): string | undefined {
    const last = segments.at(-1);
    if (!last?.endsWith(EXT) || last === EXT) return undefined;
    const parts = [...segments.slice(0, -1), last.slice(0, -EXT.length)];
    if (parts.length === 1 && parts[0] === HOME_FILE) return "/";
    return `/${parts.join("/")}`;
}

/**
 * The entry a logical path points to, given the collections' entry routes ("/articles/[slug]"):
 * `{ itemHref, slug }` when the path is that route with ONE non-empty slug segment.
 */
export function matchEntry<H extends string>(
    itemHrefs: readonly H[],
    logicalPath: string,
): { itemHref: H; slug: string } | undefined {
    for (const itemHref of itemHrefs) {
        const prefix = itemHref.slice(0, -"[slug]".length);
        if (!logicalPath.startsWith(prefix)) continue;
        const slug = logicalPath.slice(prefix.length);
        if (slug && !slug.includes("/")) return { itemHref, slug };
    }
    return undefined;
}

/** Logical path of an entry: its route with the slug filled in. */
export const entryLogicalPath = (itemHref: string, slug: string): string => itemHref.replace("[slug]", slug);

/**
 * `text` cut to at most `max` characters on a word boundary, with an ellipsis. A single word
 * longer than the limit is cut inside the word. Whitespace runs are collapsed first.
 */
export function truncate(text: string, max: number): string {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max - 1);
    const space = cut.lastIndexOf(" ");
    const head = space > max / 2 ? cut.slice(0, space) : cut;
    return `${head.replace(/[\s,.;:!?—–-]+$/, "")}…`;
}

/** Title font size (px) by length: short titles big, long ones smaller so 3 lines always fit. */
export function titleSize(title: string): number {
    if (title.length <= 32) return 76;
    if (title.length <= 60) return 64;
    return 54;
}

/** Host shown on the image ("example.com"), without protocol nor "www.". */
export function displayHost(siteUrl: string): string {
    return new URL(siteUrl).host.replace(/^www\./, "");
}

/** MIME type of a cover file the renderer can embed (PNG, JPEG, SVG); undefined otherwise. */
export function coverMime(file: string): string | undefined {
    const ext = file.toLowerCase().split(".").at(-1);
    if (ext === "png") return "image/png";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "svg") return "image/svg+xml";
    return undefined;
}

/** `data:` URI of a file (fonts aside, Satori takes images inline). */
export const dataUri = (mime: string, bytes: Uint8Array): string =>
    `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;

/**
 * Pages that HAVE their own image: logical href → messages namespace holding `title` and
 * `description` (else `intro`, the convention of StaticPage pages): the app's pages + the enabled
 * collection listings (constants/site.ts `OG_PAGES`); a key declared twice throws (build failure).
 */
export function buildOgPages(...sources: readonly Readonly<Record<string, string>>[]): Record<string, string> {
    const pages: Record<string, string> = {};
    for (const source of sources) {
        for (const [href, namespace] of Object.entries(source)) {
            if (Object.hasOwn(pages, href)) throw new Error(`Social image of "${href}" declared twice (OG_PAGES).`);
            if (href.includes("["))
                throw new Error(`OG_PAGES: "${href}" is a dynamic route (collections are automatic).`);
            pages[href] = namespace;
        }
    }
    return pages;
}

/** Image metadata (Open Graph + Twitter large card) for an absolute image URL. */
export function socialImageMetadata(opts: { url: string; alt: string; title: string; description: string }) {
    const image = { url: opts.url, width: OG_SIZE.width, height: OG_SIZE.height, alt: opts.alt, type: OG_CONTENT_TYPE };
    return {
        images: [image],
        twitter: {
            card: "summary_large_image" as const,
            title: opts.title,
            description: opts.description,
            images: [{ url: opts.url, alt: opts.alt, width: OG_SIZE.width, height: OG_SIZE.height }],
        },
    };
}

// ---- What the image component (components/og/OgImage.tsx) receives ----------------------------

/** Colours of the image, as 6-digit hex ("#7c5cff"): the default image appends alpha digits to the accents. */
export interface OgTheme {
    readonly background: string;
    readonly surface: string;
    readonly text: string;
    readonly muted: string;
    readonly accent1: string;
    readonly accent2: string;
}

/** A font handed to `ImageResponse` (TTF/OTF/WOFF bytes). */
export interface OgFont {
    readonly name: string;
    readonly data: ArrayBuffer;
    readonly weight: 400 | 500 | 600 | 700 | 800;
    readonly style: "normal" | "italic";
}

/** What the image component receives, every text already localized and fitted. */
export interface OgImageProps {
    readonly title: string;
    readonly description: string;
    /** Section label of a collection entry (its collection title: "Articles", "Reminders"…). */
    readonly section?: string;
    readonly siteName: string;
    /** "example.com" */
    readonly host: string;
    readonly locale: string;
    /** data: URI of the logo (app/icon.svg). */
    readonly logo: string;
    /** data: URI of the entry's front-matter `image`, when it has an embeddable one. */
    readonly cover?: string;
    readonly theme: OgTheme;
    /** Font family name of `fonts` (the component's `fontFamily`). */
    readonly fontFamily: string;
}
