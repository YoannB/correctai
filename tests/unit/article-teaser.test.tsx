// Entry card thumbnail: the cover image when the front matter has one, else a decorative title
// cover (docs/articles.md → Cards without an image). Server render, no client JS.
import { ArticleTeaser, type ArticleTeaserProps } from "@/components/content/ArticleTeaser";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The card's href (lib/seo) and the components/ui barrel reach next-intl navigation (not
// resolvable under Vitest): stub both, as tests/unit/entry-badges.test.tsx does.
vi.mock("@/lib/seo", () => ({ entryPath: (_href: string, locale: string, slug: string) => `/${locale}/a/${slug}` }));
vi.mock("@/i18n/routing", () => ({
    Link: ({ children }: { children: unknown }) => children,
    usePathname: () => "/",
    useRouter: () => ({ replace: () => undefined }),
    getPathname: () => "/",
    routing: { locales: ["en"], defaultLocale: "en" },
}));

const TITLE = "Configuring Webpack & Babel: a complete walkthrough for 2016";

const render = (props: Partial<ArticleTeaserProps> = {}) => {
    const html = renderToStaticMarkup(
        <ArticleTeaser
            title={TITLE}
            description="D"
            slug="t"
            locale="en"
            date="2016-02-01"
            dateLabel="Published on February 1, 2016"
            {...props}
        />,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    return { html, thumb: doc.querySelector(".article-card__thumb")! };
};

describe("ArticleTeaser thumbnail", () => {
    it("shows the FULL title in a decorative cover when there is no image", () => {
        const { thumb } = render();
        expect(thumb.getAttribute("aria-hidden")).toBe("true");
        expect(thumb.getAttribute("tabindex")).toBe("-1");
        expect(thumb.querySelector(".article-teaser__cover-title")?.textContent).toBe(TITLE);
        expect(thumb.querySelector("img")).toBeNull();
        // No collection label unless one is passed.
        expect(thumb.querySelector(".article-teaser__cover-kicker")).toBeNull();
    });

    it("adds the collection label to the cover when given", () => {
        const { thumb } = render({ collectionLabel: "Articles" });
        expect(thumb.querySelector(".article-teaser__cover-kicker")?.textContent).toBe("Articles");
    });

    it("tags the cover with the entry's language on a fallback", () => {
        const { thumb } = render({ locale: "fr", fallback: { flag: "🇫🇷", label: "Français", title: "Only in" } });
        expect(thumb.querySelector(".article-teaser__cover")?.getAttribute("lang")).toBe("fr");
        expect(render().thumb.querySelector(".article-teaser__cover")?.hasAttribute("lang")).toBe(false);
    });

    it("keeps the title readable once by assistive tech: the heading link", () => {
        const { html } = render();
        const visible = html.replace(/<a[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/a>/, "");
        expect(visible.split(TITLE.replace("&", "&amp;")).length - 1).toBe(1);
    });

    it("shows the cover image when the entry has one, without the title cover", () => {
        const { thumb } = render({ image: "/articles/x/cover.png", collectionLabel: "Articles" });
        const img = thumb.querySelector("img");
        expect(img?.getAttribute("src")).toBe("/articles/x/cover.png");
        expect(img?.getAttribute("alt")).toBe("");
        expect(thumb.querySelector(".article-teaser__cover")).toBeNull();
    });
});
