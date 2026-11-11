import { expect, test, type Page } from "@playwright/test";
import { lp, lpRe } from "./support/locale-path";

// Button with `href` renders a REAL link styled as a button. Regression: the hero "Sitemap"
// CTA and the 404 "Back to home" used to nest a <button> inside an <a> (invalid HTML:
// interactive content inside interactive content, two tab stops, ambiguous semantics).

async function hydrated(page: Page) {
    await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
}

async function expectNoNestedInteractive(page: Page) {
    expect(await page.locator("a button, a [role='button'], button a, button button").count()).toBe(0);
}

test.describe("Button as a link", () => {
    test("the hero sitemap CTA is a localized link, reachable with the keyboard", async ({ page }) => {
        await page.goto("/fr"); // explicit prefix forces the locale (redirected to lp("fr") when fr is the default)
        await hydrated(page);
        await expectNoNestedInteractive(page);

        const cta = page.locator(".hero__cta");
        const plan = cta.getByRole("link", { name: "Plan du site" });
        await expect(plan).toHaveAttribute("href", lp("fr", "/plan-du-site"));
        await expect(cta.getByRole("button", { name: "Plan du site" })).toHaveCount(0);

        // Tab order: the demo button, then the sitemap link (one tab stop, not two).
        await cta.getByRole("button").first().focus();
        await page.keyboard.press("Tab");
        await expect(plan).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(lpRe("fr", "/plan-du-site"));
    });

    test("the 404 back-to-home action is a link to the localized home", async ({ page }) => {
        await page.goto("/fr/dsqd");
        await hydrated(page);
        await expectNoNestedInteractive(page);

        const home = page.locator(".not-found").getByRole("link", { name: "Retour à l'accueil" });
        await expect(home).toHaveAttribute("href", lp("fr"));
        await home.click();
        await expect(page).toHaveURL(lpRe("fr"));
    });
});
