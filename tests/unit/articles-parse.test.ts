// @vitest-environment node
// Inline fixtures, no fs: every fixture is built by a function, never parsed at module top level
// (see the closing `---` gotcha in docs/testing.md).
import {
    buildCatalog,
    findArticle,
    listArticles,
    parseArticleFile,
    resolveTranslation,
    splitFrontMatter,
    type ArticleFile,
} from "@/lib/articles/parse";
import { describe, expect, it } from "vitest";

const md = (header: string, body = "Body.") => `---\n${header}\n---\n\n${body}\n`;
const header = (o: Record<string, string> = {}) =>
    Object.entries({ title: "Title", slug: "my-slug", date: "2026-11-10", description: "Desc", ...o })
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
const file = (id: string, locale: string, o: Record<string, string> = {}): ArticleFile => ({
    id,
    locale,
    raw: md(header(o)),
});

describe("splitFrontMatter", () => {
    it("splits the YAML front matter from the body (body trimmed)", () => {
        expect(splitFrontMatter("---\na: 1\n---\n\n# Hi\n\n", "f")).toEqual({ data: { a: 1 }, body: "# Hi" });
    });

    it("tolerates the BOM and CRLF line endings", () => {
        expect(splitFrontMatter("﻿---\r\na: x\r\n---\r\nBody", "f")).toEqual({ data: { a: "x" }, body: "Body" });
    });

    it("rejects a file without an opening ---", () => {
        expect(() => splitFrontMatter("a: 1\n---\nBody", "x/en.md")).toThrow(/x\/en\.md.*YAML front matter missing/);
    });

    it("rejects an unclosed front matter", () => {
        expect(() => splitFrontMatter("---\na: 1\nBody", "f")).toThrow(/not closed/);
    });
});

describe("parseArticleFile — success", () => {
    it("reads the required fields, unquoted date included (YAML 1.2: stays a string)", () => {
        expect(parseArticleFile(file("demo", "fr"))).toEqual({
            id: "demo",
            locale: "fr",
            slug: "my-slug",
            title: "Title",
            description: "Desc",
            date: "2026-11-10",
            body: "Body.",
        });
    });

    it("accepts a quoted date and an absolute image", () => {
        const article = parseArticleFile(file("demo", "en", { date: '"2026-01-31"', image: "/articles/demo/c.png" }));
        expect(article.date).toBe("2026-01-31");
        expect(article.image).toBe("/articles/demo/c.png");
    });

    it("keeps an explicit archived flag (true or false) and omits it when absent", () => {
        expect(parseArticleFile(file("demo", "en", { archived: "true" })).archived).toBe(true);
        expect(parseArticleFile(file("demo", "en", { archived: "false" })).archived).toBe(false);
        expect(parseArticleFile(file("demo", "en"))).not.toHaveProperty("archived");
    });
});

describe("parseArticleFile — errors", () => {
    it("rejects an invalid folder id", () => {
        expect(() => parseArticleFile(file("Bad_Id", "en"))).toThrow(/invalid folder id/);
    });

    it("names the collection folder in the error when the file carries one", () => {
        expect(() => parseArticleFile({ ...file("Bad_Id", "en"), collection: "reminders" })).toThrow(
            "Article reminders/Bad_Id/en.md: invalid folder id",
        );
    });

    it("rejects an empty front matter", () => {
        expect(() => parseArticleFile({ id: "demo", locale: "en", raw: md("") })).toThrow(/must be an object/);
    });

    it("rejects a scalar front matter", () => {
        expect(() => parseArticleFile({ id: "demo", locale: "en", raw: md("just text") })).toThrow(/must be an object/);
    });

    it("rejects a list front matter", () => {
        expect(() => parseArticleFile({ id: "demo", locale: "en", raw: md("- a\n- b") })).toThrow(/must be an object/);
    });

    it("rejects a missing required field", () => {
        const raw = md("title: T\ndate: 2026-11-10\ndescription: D");
        expect(() => parseArticleFile({ id: "demo", locale: "en", raw })).toThrow(/"slug" required/);
    });

    it("rejects an empty or non-text required field", () => {
        expect(() => parseArticleFile(file("demo", "en", { title: '"  "' }))).toThrow(/"title" required/);
        expect(() => parseArticleFile(file("demo", "en", { description: "42" }))).toThrow(/"description" required/);
    });

    it("rejects an invalid slug", () => {
        expect(() => parseArticleFile(file("demo", "en", { slug: "Not-OK" }))).toThrow(/invalid slug "Not-OK"/);
    });

    it("rejects a malformed date", () => {
        expect(() => parseArticleFile(file("demo", "en", { date: "10/11/2026" }))).toThrow(/date "10\/11\/2026"/);
    });

    it("rejects an impossible date (month out of range => Invalid Date)", () => {
        expect(() => parseArticleFile(file("demo", "en", { date: "2026-13-45" }))).toThrow(/date "2026-13-45"/);
    });

    it("rejects a date that overflows into the next month (February 30)", () => {
        expect(() => parseArticleFile(file("demo", "en", { date: "2026-02-30" }))).toThrow(/date "2026-02-30"/);
    });

    it("rejects a relative image", () => {
        expect(() => parseArticleFile(file("demo", "en", { image: "cover.png" }))).toThrow(/absolute site path/);
    });

    it("rejects an empty image", () => {
        expect(() => parseArticleFile(file("demo", "en", { image: '""' }))).toThrow(/"image" required/);
    });

    it("rejects a non-boolean archived flag", () => {
        expect(() => parseArticleFile(file("demo", "en", { archived: '"yes"' }))).toThrow(
            /"archived" must be true or false \(got "yes"\)/,
        );
    });

    it("rejects an empty body", () => {
        expect(() => parseArticleFile({ id: "demo", locale: "en", raw: md(header(), "   ") })).toThrow(
            /empty Markdown body/,
        );
    });
});

describe("buildCatalog", () => {
    it("groups translations by article and ignores unserved locales", () => {
        const catalog = buildCatalog(
            [file("demo", "en", { slug: "hello" }), file("demo", "fr", { slug: "bonjour" }), file("demo", "de")],
            ["en", "fr"],
        );
        expect(catalog).toHaveLength(1);
        expect(Object.keys(catalog[0].translations)).toEqual(["en", "fr"]);
    });

    it("drops an article with no served translation", () => {
        expect(buildCatalog([file("demo", "de")], ["en"])).toEqual([]);
    });

    it("rejects a duplicate slug within one locale", () => {
        expect(() => buildCatalog([file("one", "en"), file("two", "en")], ["en"])).toThrow(
            /two\/en\.md.*already used by "one"/,
        );
    });

    it("names the collection folder of a duplicate slug", () => {
        const one = { ...file("one", "en"), collection: "reminders" };
        const two = { ...file("two", "en"), collection: "reminders" };
        expect(() => buildCatalog([one, two], ["en"])).toThrow(
            'Article reminders/two/en.md: slug "my-slug" already used by "one"',
        );
    });

    it("allows the same slug in two different locales", () => {
        expect(buildCatalog([file("one", "en"), file("one", "fr")], ["en", "fr"])).toHaveLength(1);
    });

    it("sorts newest to oldest (most recent translation date), then by id", () => {
        const catalog = buildCatalog(
            [
                file("old", "en", { slug: "old", date: "2025-01-01" }),
                file("b-tie", "en", { slug: "b", date: "2026-05-05" }),
                file("updated", "en", { slug: "u", date: "2024-01-01" }),
                file("updated", "fr", { slug: "u", date: "2026-06-06" }),
                file("a-tie", "en", { slug: "a", date: "2026-05-05" }),
            ],
            ["en", "fr"],
        );
        expect(catalog.map((e) => e.id)).toEqual(["updated", "a-tie", "b-tie", "old"]);
    });
});

describe("resolveTranslation / listArticles / findArticle", () => {
    const catalog = () =>
        buildCatalog(
            [
                file("both", "en", { slug: "hello", date: "2026-03-01" }),
                file("both", "fr", { slug: "bonjour", date: "2026-03-01" }),
                file("fr-only", "fr", { slug: "seulement", date: "2026-02-01" }),
                file("es-only", "es", { slug: "solo", date: "2026-01-01" }),
            ],
            ["fr", "en", "es"],
        );

    it("takes the translation of the visited locale", () => {
        expect(resolveTranslation(catalog()[0], "fr", "en", ["fr", "en", "es"])).toMatchObject({
            article: { locale: "fr", slug: "bonjour" },
            isFallback: false,
        });
    });

    it("falls back to the default locale", () => {
        expect(resolveTranslation(catalog()[0], "es", "en", ["fr", "en", "es"])).toMatchObject({
            article: { locale: "en" },
            isFallback: true,
        });
    });

    it("otherwise to the first served locale that has a translation", () => {
        expect(resolveTranslation(catalog()[2], "fr", "en", ["fr", "en", "es"])).toMatchObject({
            article: { locale: "es", slug: "solo" },
            isFallback: true,
        });
    });

    it("lists everything, or the N most recent with a limit", () => {
        const all = listArticles(catalog(), "en", "en", ["fr", "en", "es"]);
        expect(all.map((l) => [l.article.id, l.article.locale, l.isFallback])).toEqual([
            ["both", "en", false],
            ["fr-only", "fr", true],
            ["es-only", "es", true],
        ]);
        expect(listArticles(catalog(), "en", "en", ["fr", "en", "es"], 2)).toHaveLength(2);
    });

    it("finds an article by the slug of ITS locale only", () => {
        expect(findArticle(catalog(), "fr", "bonjour")?.id).toBe("both");
        expect(findArticle(catalog(), "en", "bonjour")).toBeUndefined();
        expect(findArticle(catalog(), "de", "hello")).toBeUndefined();
    });
});
