import { expect, test } from "@playwright/test";
import { ARTICLES_ENABLED } from "../../constants/site";
import { CLIENT_MESSAGES } from "../../i18n/client-messages";
import { coversPath } from "../../lib/client-messages";
import { DEFAULT_LOCALE, lp } from "./support/locale-path";
import { localized } from "./support/pathnames";

// The client provider only receives CLIENT_MESSAGES (i18n/client-messages.ts). Unit tests check
// every `useTranslations` call statically; this spec is the runtime net: next-intl reports a
// label missing on the client as a MISSING_MESSAGE console error, in production too.
const pages = ["/", ...(ARTICLES_ENABLED ? ["/articles"] : []), "/sitemap", "/legal", "/privacy", "/cookies"];

test.describe("Client messages", () => {
    for (const href of pages) {
        test(`no missing client label on ${href}`, async ({ page }) => {
            const missing: string[] = [];
            page.on("console", (message) => {
                if (message.type() === "error" && message.text().includes("MISSING_MESSAGE"))
                    missing.push(message.text());
            });
            await page.goto(localized(DEFAULT_LOCALE, href));
            await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
            if (href === "/articles") {
                await page.locator(".article-feed .article-teaser__title a").first().click();
                await expect(page.locator(".article-body")).toBeVisible();
            }
            expect(missing).toEqual([]);
        });
    }

    test("no missing client label on the 404 page", async ({ page }) => {
        const missing: string[] = [];
        page.on("console", (message) => {
            if (message.type() === "error" && message.text().includes("MISSING_MESSAGE")) missing.push(message.text());
        });
        await page.goto(lp(DEFAULT_LOCALE, "/this-page-does-not-exist"));
        await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
        expect(missing).toEqual([]);
    });

    test("server-only copy stays out of the page payload", async ({ request }) => {
        // pages.privacy is read by a Server Component only (unless a site lists it as client).
        test.skip(coversPath(CLIENT_MESSAGES, "pages.privacy"), "pages.privacy is a client path here");
        const html = await (await request.get(localized(DEFAULT_LOCALE, "/"))).text();
        expect(html).toContain('\\"nav\\":{');
        expect(html).not.toContain('\\"privacy\\":{');
    });
});
