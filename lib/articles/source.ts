import "server-only";
import { routing } from "@/i18n/routing";
import { dayIn } from "@/lib/day";
import { getNow, getTimeZone } from "next-intl/server";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { buildCatalog, findArticle, listArticles, type ArticleEntry, type ArticleFile } from "./parse";

// IO side of the Markdown collections (the pure logic is lib/articles/parse.ts, unit-tested).
// Layout: content/<collection>/<id>/<locale>.md, read via process.cwd(). The routes are rendered
// on demand (the root layout resolves the locale per request), so the files must ship with the
// server function. The LITERAL `process.cwd()/content` root is what the file tracer picks up: the
// whole content/ folder (every collection) is traced into each function that imports this
// module (checked in .next/server/app/**/page.js.nft.json). Never build this root from a
// variable; the collection folder is joined at run time below.
const CONTENT_ROOT = path.join(process.cwd(), "content");

function readFiles(collection: string): ArticleFile[] {
    const root = path.join(CONTENT_ROOT, collection);
    if (!existsSync(root)) throw new Error(`Collection "${collection}": folder content/${collection}/ missing.`);
    const dirs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
    return dirs.flatMap((dir) =>
        readdirSync(path.join(root, dir.name))
            .filter((name) => name.endsWith(".md"))
            .map((name) => ({
                id: dir.name,
                locale: name.slice(0, -3),
                raw: readFileSync(path.join(root, dir.name, name), "utf8"),
                collection,
            })),
    );
}

// Parsed once per render pass and collection (React cache), validated fail-fast by buildCatalog.
export const getCollectionCatalog = cache((collection: string): ArticleEntry[] =>
    buildCatalog(readFiles(collection), routing.locales),
);

export function getEntries(collection: string, locale: string, limit?: number) {
    return listArticles(getCollectionCatalog(collection), locale, routing.defaultLocale, routing.locales, limit);
}

export function getEntry(collection: string, locale: string, slug: string) {
    return findArticle(getCollectionCatalog(collection), locale, slug);
}

// The articles = the default collection (historical API, unchanged).
export const getCatalog = (): ArticleEntry[] => getCollectionCatalog("articles");

export function getArticles(locale: string, limit?: number) {
    return getEntries("articles", locale, limit);
}

export function getArticle(locale: string, slug: string) {
    return getEntry("articles", locale, slug);
}

// "Today" for the New badge: the calendar day of the request in next-intl's `timeZone`
// (i18n/request.ts), the zone the site's dates are read in. Every route under [locale] renders on
// demand, so it is evaluated per request (docs/articles.md → New and archive badges).
export async function collectionToday(locale: string): Promise<string> {
    const [now, timeZone] = await Promise.all([getNow({ locale }), getTimeZone({ locale })]);
    return dayIn(now.getTime(), timeZone);
}
