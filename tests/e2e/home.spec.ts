import { expect, test } from "@playwright/test";
import { acceptCookiesButton, cookieBanner, languageButton, languageOption, themeToggle } from "./support/home";
import { lpRe } from "./support/locale-path";

test.describe("Home — structural smoke", () => {
    test("shows the hero, the component library, the SEO section and the FAQ", async ({ page }) => {
        await page.goto("/");

        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("#showcase")).toBeVisible();
        await expect(page.locator("#seo")).toBeVisible();
        await expect(page.locator("#faq")).toBeVisible();
    });

    test("the cookie banner appears then hides after acceptance", async ({ page }) => {
        await page.goto("/");

        const banner = cookieBanner(page);
        await expect(banner).toBeVisible();

        await acceptCookiesButton(page).click();

        await expect(banner).toBeHidden();
    });

    test("FR ↔ EN language switch keeps the current page", async ({ page }) => {
        await page.goto("/");

        await languageButton(page).click();
        await languageOption(page, "Français").click();

        await expect(page).toHaveURL(lpRe("fr"));

        await languageButton(page).click();
        await languageOption(page, "English").click();

        await expect(page).toHaveURL(lpRe("en"));
    });

    test("the theme toggle sets data-theme on <html>", async ({ page }) => {
        await page.goto("/");

        const before = await page.getAttribute("html", "data-theme");

        await themeToggle(page).click();

        const after = await page.getAttribute("html", "data-theme");

        expect(after).not.toBe(before);
        expect(["light", "dark"]).toContain(after);
    });
});
