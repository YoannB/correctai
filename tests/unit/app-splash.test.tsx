import { AppSplash } from "@/components/ui/AppSplash";
import { SPLASH } from "@/constants/site";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

// The pre-hydration splash (app/layout.tsx → AppSplash) and its option SPLASH
// (constants/site.ts; docs/seo-layout.md → Pre-hydration splash).

describe("SPLASH — what the splash shows", () => {
    it("is two booleans, logo and bar", () => {
        expect(Object.keys(SPLASH).sort()).toEqual(["bar", "logo"]);
        expect(typeof SPLASH.logo).toBe("boolean");
        expect(typeof SPLASH.bar).toBe("boolean");
    });
});

describe("AppSplash — #app-splash content", () => {
    const render = (logo: boolean, bar: boolean) => {
        const host = document.createElement("div");
        host.innerHTML = renderToStaticMarkup(<AppSplash logo={logo} bar={bar} />);
        const splash = host.querySelector("#app-splash");
        if (!splash) throw new Error("no #app-splash");
        return splash;
    };

    it("is a decorative node: aria-hidden, no accessible announcement", () => {
        expect(render(true, true).getAttribute("aria-hidden")).toBe("true");
    });

    it("bar only: no logo", () => {
        const splash = render(false, true);
        expect(splash.querySelector("svg")).toBeNull();
        expect(splash.querySelectorAll(".loader__bar")).toHaveLength(1);
    });

    it("logo + bar: the real Logo with .splash-logo, ABOVE the bar", () => {
        const splash = render(true, true);
        const [logo, bar] = Array.from(splash.children);
        expect(logo.tagName.toLowerCase()).toBe("svg");
        expect(logo.classList.contains("logo")).toBe(true);
        expect(logo.classList.contains("splash-logo")).toBe(true);
        expect(logo.getAttribute("width")).toBe("120");
        expect(bar.classList.contains("loader__bar")).toBe(true);
    });

    it("logo only, or nothing", () => {
        expect(render(true, false).querySelector(".loader__bar")).toBeNull();
        expect(render(true, false).querySelector(".splash-logo")).not.toBeNull();
        expect(render(false, false).children).toHaveLength(0);
    });
});
