// Render of an ARCHIVED entry (docs/articles.md → New and archive badges): the entry page shows the
// Archive badge and the archive notice and never offers comments, and its card in a listing carries
// the Archive badge, never New. The demo publishes no archived article, so the entry is an in-memory
// fixture handed to the real page factory and feed (the content source is mocked): nothing is
// added to the site. The status rules are covered by tests/unit/articles-status.test.ts, the badge
// mapping by tests/unit/entry-badges.test.tsx.
import type { ArticleEntry, ListedArticle } from "@/lib/articles/parse";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const source = vi.hoisted(() => ({ entry: undefined as ArticleEntry | undefined }));

vi.mock("server-only", () => ({}));
// next-intl's navigation factory imports "next/navigation", which does not resolve under Vitest.
vi.mock("@/i18n/routing", () => ({
    Link: ({ children }: { children: ReactNode }) => children,
    usePathname: () => "/",
    useRouter: () => ({ replace: () => undefined }),
    getPathname: () => "/",
    routing: { locales: ["fr"], defaultLocale: "fr" },
}));
vi.mock("next/navigation", () => ({
    notFound: () => {
        throw new Error("notFound");
    },
}));
// Messages are returned as "<namespace>.<key>" so the assertions name what is rendered.
vi.mock("next-intl/server", () => ({
    getTranslations:
        async ({ namespace }: { namespace: string }) =>
        (key: string) =>
            `${namespace}.${key}`,
    getFormatter: async () => ({ dateTime: () => "12 mars 2015" }),
}));
vi.mock("@/lib/articles/source", () => ({
    getEntry: () => source.entry,
    getEntries: () => [],
    collectionToday: async () => "2026-11-18",
}));
// Comments switched on for the collection whatever the build env says, so their absence under an
// archive is the page's decision. The client component is replaced by a marker.
// The collection is forced ON too: a site may ship with ARTICLES_ENABLED = false (the page would
// then answer notFound before rendering anything under test).
vi.mock("@/constants/site", async (importOriginal) => {
    const site = await importOriginal<typeof import("@/constants/site")>();
    return {
        ...site,
        COMMENTS: { provider: "disqus", shortname: "fake-forum" },
        collectionComments: () => true,
        getCollection: (id: string) => ({ ...site.getCollection(id), enabled: true }),
    };
});
vi.mock("@/components/content/EntryComments", () => ({
    EntryComments: () => <section data-entry-comments="" />,
}));
// The page frame (MUI breadcrumb and card) is not under test.
vi.mock("@/components/content/StaticPage", () => ({
    StaticPage: ({ title, body }: { title: string; body: ReactNode }) => (
        <main>
            <h1>{title}</h1>
            {body}
        </main>
    ),
}));

const { collectionEntry } = await import("@/components/content/CollectionPages");
const { ArticleFeed } = await import("@/components/content/ArticleFeed");

const article = (archived: boolean) => ({
    id: "old-entry",
    locale: "fr",
    slug: "ancienne-entree",
    title: "Une ancienne entrée",
    description: "Gardée telle quelle.",
    date: "2015-03-12",
    archived,
    body: "Le contenu d'origine.",
});

async function renderEntry(archived: boolean) {
    source.entry = { id: "old-entry", translations: { fr: article(archived) } };
    const { Page } = collectionEntry("articles");
    return renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "fr", slug: "ancienne-entree" }) }));
}

describe("an archived entry", () => {
    beforeEach(() => {
        source.entry = undefined;
    });

    it("entry page: Archive badge in the meta line, the archive notice, no comments", async () => {
        const html = await renderEntry(true);
        expect(html).toMatch(/class="article__meta[^"]*"[\s\S]*entry-badge--archive[\s\S]*entryStatus\.archive</);
        expect(html).not.toContain("entry-badge--new");
        expect(html).toContain('<p class="article__archive-notice">entryStatus.archiveNotice</p>');
        expect(html).not.toContain("data-entry-comments");
        expect(html).toContain("Le contenu d&#x27;origine.");
    });

    it("the same entry NOT archived: no badge, no notice, comments offered", async () => {
        const html = await renderEntry(false);
        expect(html).not.toContain("entry-badge--archive");
        expect(html).not.toContain("article__archive-notice");
        expect(html).toContain("data-entry-comments");
    });

    it("listing card: the Archive badge, never New", async () => {
        const items: ListedArticle[] = [{ article: article(true), isFallback: false }];
        const html = renderToStaticMarkup(await ArticleFeed({ items, locale: "fr" }));
        expect(html.match(/entry-badge--archive/g)).toHaveLength(1);
        expect(html).not.toContain("entry-badge--new");
        expect(html).toContain("Une ancienne entrée");
    });
});
