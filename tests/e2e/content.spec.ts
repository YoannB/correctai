import { expect, test } from "@playwright/test";

// CorrectAI home content: localized metadata + hreflang, schema.org graph, the article 50 block
// with its external references, the FAQ and the data note.

test.describe("Home content & SEO", () => {
    test("localized title, description and hreflang alternates", async ({ page }) => {
        await page.goto("/fr");
        await expect(page).toHaveTitle("CorrectAI – Correction orthographique & grammaticale par IA");
        await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /orthographe, grammaire/);
        for (const lang of ["fr", "en", "es", "de", "it", "pt", "x-default"]) {
            await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
        }
        await page.goto("/de");
        await expect(page).toHaveTitle(/KI-Rechtschreib/);
    });

    test("schema.org graph: web app, how-to and FAQ", async ({ page }) => {
        await page.goto("/fr");
        const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
        const types = (JSON.parse(raw ?? "{}") as { "@graph": { "@type": string }[] })["@graph"].map((n) => n["@type"]);
        expect(types).toEqual(["WebApplication", "HowTo", "FAQPage"]);
    });

    test("article 50 block links to the official summary and the short video", async ({ page }) => {
        await page.goto("/fr");
        const seo = page.locator("#seo");
        await expect(seo.getByRole("heading", { name: "Article 50 : ce qu'il faut retenir" })).toBeVisible();
        await expect(
            seo.getByRole("link", { name: "Consulter la synthèse officielle de l'article 50" }),
        ).toHaveAttribute("href", "https://artificialintelligenceact.eu/fr/transparency-rules-article-50/");
        await expect(seo.getByRole("link", { name: "Ouvrir la vidéo courte" })).toHaveAttribute(
            "href",
            "https://www.youtube.com/shorts/mNib6lbM-b8",
        );
        await expect(seo.locator(".video-embed.is-short")).toBeVisible();
        await expect(page.locator("#faq .faq__item")).toHaveCount(6);
        await expect(page.locator("#data")).toContainText("Respect de vos données");
    });
});
