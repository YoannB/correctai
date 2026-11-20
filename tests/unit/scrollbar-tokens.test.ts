import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The scrollbar colours are tokens (styles/tokens.css) consumed by styles/scrollbars.css: recolour
// them in styles/tokens.css only. Rendering is checked by tests/e2e/scrollbars.spec.ts.
const read = (file: string) => readFileSync(path.resolve(import.meta.dirname, "../..", file), "utf8");
const tokens = read("styles/tokens.css");

/** The declarations of the FIRST block opened by `selector` (tokens.css has no nesting). */
function block(selector: string): string {
    const start = tokens.indexOf(`${selector} {`);
    expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
    return tokens.slice(start, tokens.indexOf("}", start));
}

describe("scrollbar tokens", () => {
    it("defines size, track and thumb in the dark default", () => {
        const dark = block(":root");
        for (const t of ["--scrollbar-size", "--scrollbar-track", "--scrollbar-thumb", "--scrollbar-thumb-hover"]) {
            expect(dark).toMatch(new RegExp(`${t}:\s*[^;]+;`));
        }
    });

    it("re-tunes both thumb colours in the light theme", () => {
        const light = block('[data-theme="light"]');
        expect(light).toMatch(/--scrollbar-thumb:\s*[^;]+;/);
        expect(light).toMatch(/--scrollbar-thumb-hover:\s*[^;]+;/);
    });

    it("is consumed by styles/scrollbars.css, imported after the base styles", () => {
        const css = read("styles/scrollbars.css");
        expect(css).toContain("scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track)");
        expect(css).toContain("var(--scrollbar-thumb-hover)");
        const manifest = read("app/globals.css");
        const at = manifest.indexOf('@import "../styles/scrollbars.css";');
        expect(at).toBeGreaterThan(manifest.indexOf('@import "../styles/base.css";'));
    });
});
