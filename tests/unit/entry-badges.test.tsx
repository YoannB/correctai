// "New" / "Archive" badges: the status → badges mapping and the card render. The New badge depends
// on the day of the request, so it is checked here with an injected status rather than by a dated
// E2E fixture that would expire (docs/articles.md → New and archive badges).
import { ArticleTeaser } from "@/components/content/ArticleTeaser";
import { badgesFor, EntryBadges } from "@/components/content/EntryBadges";
import { entryStatus } from "@/lib/articles/status";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The card's href (lib/seo) and the components/ui barrel reach next-intl navigation (not
// resolvable under Vitest): stub both, as tests/unit/seo-resources.test.tsx does.
vi.mock("@/lib/seo", () => ({ entryPath: (_href: string, locale: string, slug: string) => `/${locale}/a/${slug}` }));
vi.mock("@/i18n/routing", () => ({
    Link: ({ children }: { children: unknown }) => children,
    usePathname: () => "/",
    useRouter: () => ({ replace: () => undefined }),
    getPathname: () => "/",
    routing: { locales: ["en"], defaultLocale: "en" },
}));

const LABELS = { new: "New", archive: "Archive" };

describe("badgesFor", () => {
    it("maps each status flag to its translated badge", () => {
        expect(badgesFor({ isNew: false, isArchived: false }, LABELS)).toEqual([]);
        expect(badgesFor({ isNew: true, isArchived: false }, LABELS)).toEqual([{ kind: "new", label: "New" }]);
        expect(badgesFor({ isNew: false, isArchived: true }, LABELS)).toEqual([{ kind: "archive", label: "Archive" }]);
    });
});

describe("EntryBadges / ArticleTeaser", () => {
    const teaser = (badges?: ReturnType<typeof badgesFor>) =>
        renderToStaticMarkup(
            <ArticleTeaser
                title="T"
                description="D"
                slug="t"
                locale="en"
                date="2026-11-16"
                dateLabel="Published on November 16, 2026"
                badges={badges}
            />,
        );

    it("renders nothing without badges (the default card is unchanged)", () => {
        expect(renderToStaticMarkup(<EntryBadges />)).toBe("");
        expect(renderToStaticMarkup(<EntryBadges badges={[]} />)).toBe("");
        expect(teaser()).not.toContain("entry-badges");
    });

    it("renders a dated entry of today as New, as visible text", () => {
        const status = entryStatus({ date: "2026-11-16" }, { newForDays: 90 }, "2026-11-16");
        const html = teaser(badgesFor(status, LABELS));
        expect(html).toMatch(/class="entry-badge entry-badge--new".*>New</);
        expect(html).not.toContain("entry-badge--archive");
    });

    it("renders an archive with its Archive badge only", () => {
        const status = entryStatus(
            { date: "2015-01-01" },
            { newForDays: 90, archiveBefore: "2018-01-01" },
            "2026-11-16",
        );
        const html = teaser(badgesFor(status, LABELS));
        expect(html).toMatch(/class="entry-badge entry-badge--archive".*>Archive</);
        expect(html).not.toContain("entry-badge--new");
    });
});
