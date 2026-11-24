import { expect, test } from "@playwright/test";

const BENIGN_CONSOLE_PATTERNS = [
    /favicon/i,
    /WebSocket/i,
    /DevTools/i,
    /React DevTools/i,
    /Download the React/i,
    /youtube|ytimg|googleapis|gstatic|doubleclick|googletagmanager/i,
];

function isBenignConsoleError(text: string, url: string): boolean {
    if (BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) {
        return true;
    }

    // Errors coming from uncontrolled external domains are ignored.
    // Application errors must come from localhost in this project.
    if (url && !url.includes("localhost")) {
        return true;
    }

    return false;
}

test.describe("Home — cross-cutting quality", () => {
    test("no application console error on the main page", async ({ page }) => {
        const errors: string[] = [];

        page.on("console", (message) => {
            if (message.type() !== "error") return;

            const text = message.text();
            const url = message.location()?.url ?? "";

            if (isBenignConsoleError(text, url)) return;

            errors.push(text);
        });

        page.on("pageerror", (error) => {
            errors.push(error.message);
        });

        await page.goto("/");
        await page.waitForLoadState("load");

        // Short window to catch deferred hydration / effect errors.
        await page.waitForTimeout(1_000);

        expect(errors).toEqual([]);
    });

    test("no horizontal overflow", async ({ page }) => {
        await page.goto("/");

        const overflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        });

        // One-pixel tolerance for sub-pixel rounding.
        expect(overflow).toBeLessThanOrEqual(1);
    });

    // The guarantees strip reuses the engine's fixed-tier .feature-strip grid (5 columns): its
    // items must fill the full width (one row on desktop) and stay inside the strip on mobile.
    test("guarantees strip spreads its items over the full width", async ({ page }) => {
        await page.goto("/");
        const strip = page.locator(".tool-features");
        await strip.scrollIntoViewIfNeeded();

        const layout = await strip.evaluate((el) => {
            const box = el.getBoundingClientRect();
            const items = [...el.querySelectorAll(".feature-strip__item")].map((it) => it.getBoundingClientRect());
            return {
                width: window.innerWidth,
                left: box.left,
                right: box.right,
                tops: items.map((r) => Math.round(r.top)),
                lefts: items.map((r) => r.left),
                rights: items.map((r) => r.right),
                cellWidth: (box.width - 40) / items.length,
            };
        });

        for (let i = 0; i < layout.lefts.length; i++) {
            expect(layout.lefts[i]).toBeGreaterThanOrEqual(layout.left - 1);
            expect(layout.rights[i]).toBeLessThanOrEqual(layout.right + 1);
        }
        if (layout.width > 1100) {
            // One row, and the last item starts in the last 1/n of the strip (no empty column).
            expect(new Set(layout.tops).size).toBe(1);
            expect(layout.lefts.at(-1)!).toBeGreaterThan(layout.right - layout.cellWidth - 40);
        } else {
            // Two columns: no row holds more than two items.
            const perRow = layout.tops.reduce<Record<number, number>>(
                (acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }),
                {},
            );
            expect(Math.max(...Object.values(perRow))).toBeLessThanOrEqual(2);
        }
    });
});
