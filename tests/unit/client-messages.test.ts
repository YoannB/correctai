// @vitest-environment node
import { SEO_RESOURCES } from "@/constants/site";
import { CLIENT_MESSAGES } from "@/i18n/client-messages";
import { coversPath, pickMessages } from "@/lib/client-messages";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

describe("coversPath", () => {
    it("covers a listed path and what is below it, not a sibling sharing a prefix", () => {
        expect(coversPath(["nav", "pages.articles"], "nav")).toBe(true);
        expect(coversPath(["nav", "pages.articles"], "pages.articles.title")).toBe(true);
        expect(coversPath(["nav"], "navigation")).toBe(false);
        expect(coversPath(["pages.articles"], "pages")).toBe(false);
    });
});

describe("pickMessages", () => {
    const catalogue = {
        nav: { home: "Home" },
        pages: { articles: { title: "Articles" }, legal: { title: "Legal" } },
        meta: { home: { title: "T" } },
    };

    it("keeps the listed namespaces and drops the rest", () => {
        expect(pickMessages(catalogue, ["nav"])).toEqual({ nav: { home: "Home" } });
    });

    it("keeps a nested path under its parents", () => {
        expect(pickMessages(catalogue, ["pages.articles", "nav"])).toEqual({
            pages: { articles: { title: "Articles" } },
            nav: { home: "Home" },
        });
    });

    it("merges overlapping paths without writing into the catalogue", () => {
        const picked = pickMessages(catalogue, ["pages", "pages.articles.title"]);
        expect(picked.pages).toEqual(catalogue.pages);
        expect(picked.pages).not.toBe(catalogue.pages);
        expect(catalogue.pages.articles).toEqual({ title: "Articles" });
    });

    it("returns an empty catalogue for no path", () => {
        expect(pickMessages(catalogue, [])).toEqual({});
    });

    it("throws on a path missing from the catalogue (also below a leaf)", () => {
        expect(() => pickMessages(catalogue, ["navv"])).toThrow('Client message path "navv" is not in the catalogue.');
        expect(() => pickMessages(catalogue, ["nav.home.x"])).toThrow('"nav.home.x"');
    });
});

// GUARD: every `useTranslations` call in the app's source reads a
// namespace that the client provider receives. A literal namespace is checked directly; a call
// without one (`useTranslations()`, a variable) must declare what it reads in a
// `// client-messages: a, b` comment in its file. Server Components use getTranslations.
const SKIP_DIRS = new Set([
    "node_modules",
    "tests",
    "storybook-static",
    "coverage",
    "playwright-report",
    "test-results",
]);
const SKIP_FILE = /\.(stories|test|spec)\.tsx?$|\.d\.ts$/;

function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            return entry.name.startsWith(".") || SKIP_DIRS.has(entry.name) ? [] : sources(path);
        }
        return /\.tsx?$/.test(entry.name) && !SKIP_FILE.test(entry.name) ? [path] : [];
    });
}

const CALL = /\buseTranslations\(\s*([^)]*?)\s*\)/g;
const LITERAL = /^(["'`])([\w.-]+)\1$/;
const DECLARED = /\/\/[ \t]*client-messages:[ \t]*([\w., \t-]+)/;

/** Problems of `files` against the serialized `paths`: one line per unserved or undeclared read. */
function unserved(files: readonly { file: string; text: string }[], paths: readonly string[]): string[] {
    const problems: string[] = [];
    for (const { file, text } of files) {
        const declared = DECLARED.exec(text)?.[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        for (const [, arg] of text.matchAll(CALL)) {
            const literal = LITERAL.exec(arg);
            const namespaces = literal ? [literal[2]] : declared;
            if (!namespaces)
                problems.push(`${file}: useTranslations(${arg}) needs a literal namespace or "// client-messages:"`);
            else for (const ns of namespaces) if (!coversPath(paths, ns)) problems.push(`${file}: "${ns}"`);
        }
    }
    return problems;
}

describe("client messages guard", () => {
    const files = sources(process.cwd()).map((path) => ({
        file: relative(process.cwd(), path).replaceAll("\\", "/"),
        text: readFileSync(path, "utf8"),
    }));

    it("flags an unserved literal, an undeclared dynamic call, and a declared but unserved path", () => {
        const fixtures = [
            { file: "ok.tsx", text: `useTranslations("nav"); useTranslations('pages.articles')` },
            { file: "a.tsx", text: 'useTranslations("ide")' },
            { file: "b.tsx", text: "useTranslations(); useTranslations(ns)" },
            { file: "c.tsx", text: "// client-messages: nav, ide\nuseTranslations()" },
        ];
        expect(unserved(fixtures, ["nav", "pages.articles"])).toEqual([
            'a.tsx: "ide"',
            'b.tsx: useTranslations() needs a literal namespace or "// client-messages:"',
            'b.tsx: useTranslations(ns) needs a literal namespace or "// client-messages:"',
            'c.tsx: "ide"',
        ]);
    });

    it("scans the app sources (sanity: Header and Footer are found)", () => {
        const scanned = files.filter((f) => /\buseTranslations\(/.test(f.text)).map((f) => f.file);
        expect(scanned).toEqual(
            expect.arrayContaining(["components/layout/Header.tsx", "components/layout/Footer.tsx"]),
        );
    });

    it("every useTranslations namespace is serialized to the client (i18n/client-messages.ts)", () => {
        expect(unserved(files, CLIENT_MESSAGES), "add these paths to i18n/client-messages.ts (docs/i18n.md)").toEqual(
            [],
        );
    });
    it("no Client Component reads the raw catalogue (useMessages would see the client subset only)", () => {
        expect(files.filter((f) => /\buseMessages\(/.test(f.text)).map((f) => f.file)).toEqual([]);
    });

    it("the SEO resource keys read by ArticleCard are serialized", () => {
        const keys = SEO_RESOURCES.flatMap((r) => [r.titleKey, r.summaryKey, r.sourceKey, r.durationKey]);
        expect(keys.filter((k) => !coversPath(CLIENT_MESSAGES, k))).toEqual([]);
    });

    for (const locale of ["fr", "en", "es", "de", "it", "pt"]) {
        it(`every client path exists in the ${locale} catalogue`, async () => {
            const messages = (await import(`../../messages/${locale}.json`)).default;
            expect(Object.keys(pickMessages(messages, CLIENT_MESSAGES)).length).toBeGreaterThan(0);
        });
    }
});
