import { expect, test, type Page } from "@playwright/test";
import { ARTICLES_ENABLED } from "../../constants/site";
import { acceptCookiesButton, cookieBanner, languageButton, languageOption } from "./support/home";

// v0.4.0 articles: listing -> article -> language switch onto the TRANSLATED slug, SEO tags,
// sitemap and the home "latest articles" block. Relies on the two demo articles shipped in
// content/articles/ (translated in every supported locale).

async function ready(page: Page) {
    await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
    // The cookie banner (present when CI enables ads) must not sit over the links we click.
    if (await cookieBanner(page).isVisible()) {
        await acceptCookiesButton(page).click();
        await expect(cookieBanner(page)).toBeHidden();
    }
}

test.describe("Articles", () => {
    // A derived site that turned the section off (constants/site.ts) has nothing to check here.
    test.skip(!ARTICLES_ENABLED, "articles section disabled (ARTICLES_ENABLED = false)");

    test("list -> article -> language switch on the translated slug", async ({ page }) => {
        await page.goto("/fr/articles");
        await ready(page);
        await expect(page.getByRole("heading", { level: 1, name: "Articles" })).toBeVisible();
        // Newest first.
        const titles = page.locator(".article-feed .article-teaser__title");
        await expect(titles).toHaveText(["Écrire un article dans Axons", "L'architecture d'Axons en cinq minutes"]);

        await titles.first().getByRole("link").click();
        await expect(page).toHaveURL(/\/fr\/articles\/ecrire-un-article$/);
        await expect(page.getByRole("heading", { level: 1, name: "Écrire un article dans Axons" })).toBeVisible();
        // Markdown rendered as elements: GFM table and fenced code.
        await expect(page.locator(".article-body table")).toBeVisible();
        await expect(page.locator(".article-body pre code").first()).toContainText("content/articles/");

        await languageButton(page).click();
        await languageOption(page, "Deutsch").click();
        await expect(page).toHaveURL(/\/de\/artikel\/einen-artikel-schreiben$/);
        await expect(page.getByRole("heading", { level: 1, name: "Einen Artikel in Axons schreiben" })).toBeVisible();
    });

    test("canonical, hreflang and JSON-LD of the article page", async ({ page }) => {
        await page.goto("/fr/articles/visite-de-l-architecture");
        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveAttribute("href", /\/fr\/articles\/visite-de-l-architecture$/);
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
            "href",
            /\/articles\/architecture-tour$/,
        );
        await expect(page.locator('link[rel="alternate"][hreflang="pt"]')).toHaveAttribute(
            "href",
            /\/pt\/artigos\/tour-pela-arquitetura$/,
        );
        const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
        expect(jsonLd).toMatchObject({ "@type": "BlogPosting", inLanguage: "fr", datePublished: "2026-11-03" });
    });

    test("a slug from another language leads to the 404 page, not indexable", async ({ page }) => {
        // Soft 404: app/[locale]/loading.tsx starts streaming before notFound() runs, so Next keeps
        // the 200 status and adds robots noindex (same behavior as every page under [locale]).
        await page.goto("/fr/articles/architecture-tour");
        await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
        await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
        await expect(page.getByText("Nous avons fouillé tout le multivers")).toBeVisible();
        await page.getByRole("link", { name: "Retour à l'accueil" }).click();
        await expect(page).toHaveURL(/\/fr$/);
    });

    test("home shows the latest articles with a link to the list", async ({ page }) => {
        await page.goto("/fr");
        await ready(page);
        const block = page.locator("#latest-articles");
        await expect(block.getByRole("heading", { level: 2, name: "Derniers articles" })).toBeVisible();
        await expect(block.locator(".article-teaser")).toHaveCount(2);
        await block.getByRole("link", { name: /Tous les articles/ }).click();
        await expect(page).toHaveURL(/\/fr\/articles$/);
    });

    test("the sitemap lists every article translation", async ({ request }) => {
        const xml = await (await request.get("/sitemap.xml")).text();
        expect(xml).toContain("/fr/articles/ecrire-un-article</loc>");
        expect(xml).toContain("/articles/writing-an-article</loc>");
        expect(xml).toContain("/de/artikel</loc>");
    });
});
