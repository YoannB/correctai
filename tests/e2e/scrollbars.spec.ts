import { expect, test, type Page } from "@playwright/test";

// Themed scrollbars (styles/scrollbars.css): computed values only, never pixels. Desktop gets the
// thin themed bars in both themes; touch devices (the "mobile" project) keep the native ones.

async function scrollbarStyle(page: Page, theme: "dark" | "light") {
    return page.evaluate((t) => {
        const html = document.documentElement;
        html.dataset.theme = t;
        const cs = getComputedStyle(html);
        return {
            width: cs.scrollbarWidth,
            color: cs.scrollbarColor,
            thumb: cs.getPropertyValue("--scrollbar-thumb").trim(),
            thumbHover: cs.getPropertyValue("--scrollbar-thumb-hover").trim(),
            track: cs.getPropertyValue("--scrollbar-track").trim(),
            size: cs.getPropertyValue("--scrollbar-size").trim(),
        };
    }, theme);
}

test.describe("themed scrollbars", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("desktop: thin, token-coloured bars in dark and light", async ({ page, isMobile }) => {
        test.skip(isMobile, "touch devices keep the native scrollbars");
        const dark = await scrollbarStyle(page, "dark");
        const light = await scrollbarStyle(page, "light");
        for (const s of [dark, light]) {
            expect(s.width).toBe("thin");
            expect(s.color).not.toBe("auto");
            expect(s.thumb).not.toBe("");
            expect(s.thumbHover).not.toBe("");
            expect(s.track).not.toBe("");
            expect(s.size).toBe("10px");
        }
        // The light theme re-tunes the thumb: the computed colour differs between themes.
        expect(light.color).not.toBe(dark.color);
    });

    test("touch: native scrollbars are left alone", async ({ page, isMobile }) => {
        test.skip(!isMobile, "desktop-only check above");
        const s = await scrollbarStyle(page, "dark");
        expect(s.width).toBe("auto");
        expect(s.color).toBe("auto");
        expect(s.thumb).not.toBe(""); // the tokens still exist, only the rules are gated
    });
});
