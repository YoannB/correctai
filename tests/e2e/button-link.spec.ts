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
