import { COOKIE_CONSENT, COOKIE_THEME } from "@/lib/cookies";
import { buildBootScript } from "@/lib/boot-script";
import { LS_THEME_MODE } from "@/lib/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Runs the REAL boot script string in jsdom: what the browser executes before hydration.
const LOCALES = ["en", "fr"];

function run(system: "light" | "dark") {
    vi.stubGlobal(
        "matchMedia",
        (q: string) => ({ matches: q === "(prefers-color-scheme: dark)" && system === "dark" }) as MediaQueryList,
    );
    new Function(buildBootScript(LOCALES))();
    return document.documentElement;
}

function clearCookie(name: string) {
    document.cookie = `${name}=;path=/;max-age=0`;
}

beforeEach(() => {
    localStorage.clear();
    clearCookie(COOKIE_THEME);
    clearCookie(COOKIE_CONSENT);
    delete document.documentElement.dataset.theme;
    document.documentElement.classList.remove("has-consent");
    document.documentElement.removeAttribute("lang");
});
afterEach(() => vi.unstubAllGlobals());

describe("boot script — theme", () => {
    it("follows the system when nothing is stored (dark)", () => {
        expect(run("dark").dataset.theme).toBe("dark");
    });

    it("follows the system when nothing is stored (light)", () => {
        expect(run("light").dataset.theme).toBe("light");
    });

    it("reads the JSON value writeLS stores (quotes included)", () => {
        localStorage.setItem(LS_THEME_MODE, JSON.stringify("dark"));
        expect(run("light").dataset.theme).toBe("dark");
        localStorage.setItem(LS_THEME_MODE, JSON.stringify("light"));
        expect(run("dark").dataset.theme).toBe("light");
    });

    it('a stored "system" follows the system and ignores the cookie (same order as hydrateClient)', () => {
        localStorage.setItem(LS_THEME_MODE, JSON.stringify("system"));
        document.cookie = `${COOKIE_THEME}=light;path=/`;
        expect(run("dark").dataset.theme).toBe("dark");
    });

    it("falls back to the theme cookie when localStorage is empty", () => {
        document.cookie = `${COOKIE_THEME}=dark;path=/`;
        expect(run("light").dataset.theme).toBe("dark");
    });

    it("falls back to the cookie when localStorage holds invalid JSON", () => {
        localStorage.setItem(LS_THEME_MODE, "{not json");
        document.cookie = `${COOKIE_THEME}=light;path=/`;
        expect(run("dark").dataset.theme).toBe("light");
    });

    it("an unknown stored value follows the system", () => {
        localStorage.setItem(LS_THEME_MODE, JSON.stringify("sepia"));
        expect(run("dark").dataset.theme).toBe("dark");
    });

    it("never throws (no matchMedia): leaves the server default in place", () => {
        vi.stubGlobal("matchMedia", undefined);
        document.documentElement.dataset.theme = "dark";
        expect(() => new Function(buildBootScript(LOCALES))()).not.toThrow();
        expect(document.documentElement.dataset.theme).toBe("dark");
    });
});

describe("boot script — consent and lang", () => {
    it("adds has-consent only when the consent cookie exists", () => {
        expect(run("dark").classList.contains("has-consent")).toBe(false);
        document.cookie = `${COOKIE_CONSENT}=%7B%7D;path=/`;
        expect(run("dark").classList.contains("has-consent")).toBe(true);
    });

    it("sets lang from a served locale segment only", () => {
        window.history.replaceState(null, "", "/fr/articles");
        expect(run("dark").getAttribute("lang")).toBe("fr");
        document.documentElement.removeAttribute("lang");
        window.history.replaceState(null, "", "/articles");
        expect(run("dark").getAttribute("lang")).toBeNull();
    });
});
