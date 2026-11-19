import { expect, test, type Page } from "@playwright/test";
import { COLLECTIONS } from "../../constants/site";
import { LOCALES } from "../../i18n/locales";
import { DEFAULT_LOCALE } from "./support/locale-path";
import { localized } from "./support/pathnames";

// Teaser links of every collection listing point to the translation's OWN URL as the middleware
// serves it (localePrefix "as-needed"): never `/<default>/…`, which answers 307. Site-agnostic:
// runs for whatever default locale and collections the build declares.

async function teaserHrefs(page: Page): Promise<{ href: string; fallback: boolean }[]> {
    return page.locator(".article-feed .article-teaser").evaluateAll((cards) =>
        cards.map((card) => ({
            href: card.querySelector(".article-teaser__title a")?.getAttribute("href") ?? "",
            fallback: card.querySelector(".article-teaser__lang") !== null,
        })),
    );
}

const OTHER_LOCALE = LOCALES.find((l) => l !== DEFAULT_LOCALE);

for (const collection of COLLECTIONS.filter((c) => c.enabled)) {
    test.describe(`Teaser links — ${collection.id}`, () => {
        test("default locale: no default-locale prefix, no redirect", async ({ page, request }) => {
            await page.goto(localized(DEFAULT_LOCALE, collection.href));
            const teasers = await teaserHrefs(page);
            test.skip(teasers.length === 0, "empty collection");

            for (const { href } of teasers) {
                expect(href, href).not.toMatch(new RegExp(`^/${DEFAULT_LOCALE}(/|$)`));
                const res = await request.get(href, { maxRedirects: 0 });
                expect(res.status(), href).toBe(200);
            }
        });

        test("another locale: own-language entries keep that locale's prefix", async ({ page }) => {
            test.skip(!OTHER_LOCALE, "single served locale");
            const locale = OTHER_LOCALE as string;
            await page.goto(localized(locale, collection.href));
            const teasers = await teaserHrefs(page);
            test.skip(teasers.length === 0, "empty collection");

            for (const { href, fallback } of teasers) {
                if (!fallback) expect(href, href).toMatch(new RegExp(`^/${locale}/`));
                expect(href, href).not.toMatch(new RegExp(`^/${DEFAULT_LOCALE}(/|$)`));
            }
        });
    });
}
