import { expect, test, type Page } from "@playwright/test";
import { COOKIE_THEME } from "../../lib/cookies";
import { LS_THEME_MODE } from "../../lib/storage";
import { themeToggle } from "./support/home";

// Theme flash at hydration: EVERY value <html data-theme> takes during the load is recorded by a
// MutationObserver installed before any page script (addInitScript), so a value written and then
// corrected within the same load (a one-frame flash, invisible to a final-state assertion) still
// fails the spec. The `data-theme` the server HTML ships with is a parse-time default the head
// boot script replaces before the first paint: only WRITES (attribute mutations) are recorded.
//
// Each test uses a fresh context (Playwright's default): no cookie, no localStorage.

declare global {
    interface Window {
        __themeWrites?: string[];
    }
}

async function recordThemeWrites(page: Page) {
    await page.addInitScript(() => {
        const writes: string[] = [];
        window.__themeWrites = writes;
        new MutationObserver((records) => {
            // Several writes can be batched into one callback: each value is the NEXT record's
            // oldValue, the last one the live attribute (the live value alone hides a corrected flash).
            records.forEach((r, i) => {
                const value = records[i + 1]?.oldValue ?? (r.target as Element).getAttribute("data-theme");
                writes.push(value ?? "");
            });
        }).observe(document, {
            attributes: true,
            attributeFilter: ["data-theme"],
            attributeOldValue: true,
            subtree: true,
        });
    });
}

// Hydration is over once SplashLoader's effect has hidden the splash; a short grace period then
// lets any post-hydration re-render (client snapshots) commit its effects.
async function loadAndSettle(page: Page, path = "/") {
    await page.goto(path);
    await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
    await page.waitForTimeout(500);
}

async function themeWrites(page: Page): Promise<string[]> {
    return page.evaluate(() => window.__themeWrites ?? []);
}

for (const [system, other] of [
    ["dark", "light"],
    ["light", "dark"],
] as const) {
    test.describe(`Theme — system ${system}`, () => {
        test.use({ colorScheme: system });

        test(`first visit: data-theme is never "${other}"`, async ({ page }) => {
            await recordThemeWrites(page);
            await loadAndSettle(page);

            const writes = await themeWrites(page);
            expect(writes.length).toBeGreaterThan(0);
            expect(writes).not.toContain(other);
            await expect(page.locator("html")).toHaveAttribute("data-theme", system);
        });

        test(`an explicit "${other}" choice wins and never flashes "${system}"`, async ({ page }) => {
            await recordThemeWrites(page);
            await loadAndSettle(page);

            // User intent: the toggle switches to the opposite of the effective (system) theme.
            await themeToggle(page).click();
            await expect(page.locator("html")).toHaveAttribute("data-theme", other);

            // Persisted the way the app writes it (JSON in localStorage, raw in the cookie).
            const stored = await page.evaluate((key) => localStorage.getItem(key), LS_THEME_MODE);
            expect(stored).toBe(JSON.stringify(other));
            const cookies = await page.context().cookies();
            expect(cookies.find((c) => c.name === COOKIE_THEME)?.value).toBe(other);

            await page.reload();
            await expect(page.locator("#app-splash")).toHaveClass(/is-leaving/);
            await page.waitForTimeout(500);

            const writes = await themeWrites(page);
            expect(writes.length).toBeGreaterThan(0);
            expect(writes).not.toContain(system);
            await expect(page.locator("html")).toHaveAttribute("data-theme", other);
        });
    });
}
