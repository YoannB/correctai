import { expect, test, type Page } from "@playwright/test";
import { acceptCookiesButton, cookieBanner } from "./support/home";

// v0.3.0 site configuration: consent can be re-opened from the footer and the security headers
// keep same-origin framing. (CorrectAI: the showcase terminal/tabs specs left with the showcase;
// those components stay covered by Storybook.)
// These specs assume a consent-requiring tracker is configured (CI sets NEXT_PUBLIC_ADS_ENABLED).

async function hydrated(page: Page) {
    await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
}

test.describe("Site configuration", () => {
    test("an unknown URL shows the localized 404, not the frozen splash", async ({ page }) => {
        // Regression: without app/[locale]/[...rest] Next rendered its default 404 outside the
        // [locale] layout (no SplashLoader), so the splash never left the screen.
        // Unprefixed path first: once a locale is visited, its cookie redirects "/dsqd" there.
        for (const [url, button] of [
            ["/dsqd", "Back to home"],
            ["/fr/dsqd", "Retour à l'accueil"],
            ["/de/a/b", "Zurück zur Startseite"],
        ]) {
            await page.goto(url);
            await hydrated(page);
            await expect(page.getByRole("banner")).toBeVisible();
            await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
            await expect(page.getByRole("link", { name: button })).toBeVisible();
        }
    });

    test("a path outside any locale shows the neutral 404 without splash", async ({ page }) => {
        const response = await page.goto("/x.y");
        expect(response?.status()).toBe(404);
        await expect(page.locator("#app-splash")).toBeHidden();
        await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
    });

    test("home stays at the top of the page after hydration", async ({ page }) => {
        // Regression: the showcase Tabs used scrollIntoView on mount, which scrolled the WINDOW
        // down to the terminal demo. The strip must scroll itself only.
        await page.goto("/fr");
        await hydrated(page);
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test('"Manage my cookies" reopens the banner after a choice', async ({ page }) => {
        await page.goto("/");
        await hydrated(page);
        await acceptCookiesButton(page).click();
        await expect(cookieBanner(page)).toBeHidden();

        await page.getByRole("contentinfo").getByRole("button", { name: "Manage cookies" }).click();
        await expect(cookieBanner(page)).toBeVisible();

        // Re-opening keeps the previous choice: the visitor can now change it.
        await acceptCookiesButton(page).click();
        await expect(cookieBanner(page)).toBeHidden();
    });

    test("headers: framing limited to the same origin by default", async ({ request }) => {
        const res = await request.get("/");
        expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
        expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
    });
});
