// PURE module (no fs, no next-intl): parsing and indexing of the Markdown entries of a collection
// stored as content/<collection>/<id>/<locale>.md (the articles: content/articles/). The IO side lives in lib/articles/source.ts.
// Fail-fast: an invalid file throws at BUILD time with its path, never a silently missing page.
import { parse as parseYaml } from "yaml";

export interface Article {
    id: string;
    locale: string;
    slug: string;
    title: string;
    description: string;
    // ISO calendar date (YYYY-MM-DD), kept as a string: formatting goes through next-intl.
    date: string;
    // Site-absolute public path (e.g. /articles/<id>/cover.svg), optional.
    image?: string;
    // Front-matter `archived` (only when set): true/false overrides the collection's archiveBefore
    // rule for this translation (lib/articles/status.ts).
    archived?: boolean;
    body: string;
}

// One article = its translations, keyed by locale.
export interface ArticleEntry {
    id: string;
    translations: Record<string, Article>;
}

export interface ArticleFile {
    id: string;
    locale: string;
    raw: string;
    // Collection folder (e.g. "articles"), only used to name the file in errors.
    collection?: string;
}

// A listed article in a given locale: `isFallback` = shown in another language because the
// visited locale has no translation (the link then points to the original's own URL).
export interface ListedArticle {
    article: Article;
    isFallback: boolean;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DELIMITER = "---";

function fail(file: string, message: string): never {
    throw new Error(`Article ${file}: ${message}`);
}

// Splits `---\n<yaml>\n---\n<body>`. Both delimiters are mandatory (CRLF tolerated).
export function splitFrontMatter(raw: string, file: string): { data: unknown; body: string } {
    const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
    if (lines[0].trim() !== DELIMITER) fail(file, "YAML front matter missing (expected first line: ---).");
    const end = lines.indexOf(DELIMITER, 1);
    if (end === -1) fail(file, "YAML front matter not closed (closing --- missing).");
    return {
        data: parseYaml(lines.slice(1, end).join("\n")),
        body: lines
            .slice(end + 1)
            .join("\n")
            .trim(),
    };
}

function requiredString(data: Record<string, unknown>, key: string, file: string): string {
    const value = data[key];
    if (typeof value !== "string" || !value.trim()) fail(file, `field "${key}" required (non-empty text).`);
    return value.trim();
}

export function isValidIsoDate(value: string): boolean {
    if (!ISO_DATE.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseArticleFile({ id, locale, raw, collection }: ArticleFile): Article {
    const file = collection ? `${collection}/${id}/${locale}.md` : `${id}/${locale}.md`;
    if (!SLUG.test(id)) fail(file, `invalid folder id (expected: ${SLUG.source}).`);
    const { data, body } = splitFrontMatter(raw, file);
    if (!data || typeof data !== "object" || Array.isArray(data))
        fail(file, "the YAML front matter must be an object.");
    const fields = data as Record<string, unknown>;

    const slug = requiredString(fields, "slug", file);
    if (!SLUG.test(slug)) fail(file, `invalid slug "${slug}" (expected: ${SLUG.source}).`);
    const date = requiredString(fields, "date", file);
    if (!isValidIsoDate(date)) fail(file, `invalid date "${date}" (expected: YYYY-MM-DD, quoted or not).`);

    let image: string | undefined;
    if (fields.image !== undefined) {
        image = requiredString(fields, "image", file);
        if (!image.startsWith("/")) fail(file, `image "${image}" must be an absolute site path (/...).`);
    }
    const archived = fields.archived;
    if (archived !== undefined && typeof archived !== "boolean")
        fail(file, `field "archived" must be true or false (got ${JSON.stringify(archived)}).`);
    if (!body) fail(file, "empty Markdown body.");

    return {
        id,
        locale,
        slug,
        title: requiredString(fields, "title", file),
        description: requiredString(fields, "description", file),
        date,
        ...(image ? { image } : {}),
        ...(archived === undefined ? {} : { archived }),
        body,
    };
}

// Builds the catalog from every file. Files of a locale that is NOT served are ignored (a
// single-language site keeps the other translations in the repo without publishing them); an
// article with no served translation is dropped. A slug must be unique within a locale.
// Sorted newest first (latest translation date), then by id for a stable order.
export function buildCatalog(files: ArticleFile[], served: readonly string[]): ArticleEntry[] {
    const byId = new Map<string, ArticleEntry>();
    const slugOwners = new Map<string, string>();

    for (const file of files) {
        if (!served.includes(file.locale)) continue;
        const article = parseArticleFile(file);
        const key = `${article.locale}:${article.slug}`;
        const owner = slugOwners.get(key);
        if (owner) {
            const where = `${article.id}/${article.locale}.md`;
            fail(
                file.collection ? `${file.collection}/${where}` : where,
                `slug "${article.slug}" already used by "${owner}".`,
            );
        }
        slugOwners.set(key, article.id);
        const entry = byId.get(article.id) ?? { id: article.id, translations: {} };
        entry.translations[article.locale] = article;
        byId.set(article.id, entry);
    }

    // Latest date among the translations: independent of the file reading order.
    const dateOf = (entry: ArticleEntry) =>
        Object.values(entry.translations)
            .map((a) => a.date)
            .sort()
            .at(-1) as string;
    return [...byId.values()].sort((a, b) => dateOf(b).localeCompare(dateOf(a)) || a.id.localeCompare(b.id));
}

// The translation shown in `locale`: the locale itself, else the default locale, else the
// first served locale that has one. `served` order = display order (NEXT_PUBLIC_LOCALES).
export function resolveTranslation(
    entry: ArticleEntry,
    locale: string,
    defaultLocale: string,
    served: readonly string[],
): ListedArticle {
    const own = entry.translations[locale];
    if (own) return { article: own, isFallback: false };
    const fallbackLocale = [defaultLocale, ...served].find((l) => entry.translations[l]) as string;
    return { article: entry.translations[fallbackLocale], isFallback: true };
}

// Listing of `locale`, newest first; `limit` keeps the N most recent (the "latest" block).
export function listArticles(
    catalog: ArticleEntry[],
    locale: string,
    defaultLocale: string,
    served: readonly string[],
    limit?: number,
): ListedArticle[] {
    const listed = catalog.map((entry) => resolveTranslation(entry, locale, defaultLocale, served));
    return limit === undefined ? listed : listed.slice(0, limit);
}

export function findArticle(catalog: ArticleEntry[], locale: string, slug: string): ArticleEntry | undefined {
    return catalog.find((entry) => entry.translations[locale]?.slug === slug);
}
