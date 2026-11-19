import { Terminal } from "@/components/ui/Terminal";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const LINES = [{ id: "1", text: "hello" }];

function body(html: string): HTMLElement {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host.querySelector(".terminal__body") as HTMLElement;
}

describe("Terminal — live prop", () => {
    it("is a polite live log by default", () => {
        const el = body(renderToStaticMarkup(<Terminal ariaLabel="Demo" lines={LINES} />));
        expect(el.getAttribute("role")).toBe("log");
        expect(el.getAttribute("aria-live")).toBe("polite");
        expect(el.getAttribute("aria-label")).toBe("Demo");
    });

    it("live={false}: a named region, no log role, no aria-live", () => {
        const el = body(renderToStaticMarkup(<Terminal ariaLabel="Sample" lines={LINES} live={false} />));
        expect(el.getAttribute("role")).toBe("region");
        expect(el.hasAttribute("aria-live")).toBe(false);
        expect(el.getAttribute("aria-label")).toBe("Sample");
        expect(el.getAttribute("tabindex")).toBe("0");
        expect(el.textContent).toBe("hello");
    });
});
