import { DEFAULT_SITE_URL, normalizeSiteUrl } from "@/lib/site-url";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("normalizeSiteUrl", () => {
    it("keeps a URL without trailing slash unchanged", () => {
        expect(normalizeSiteUrl("https://example.com")).toBe("https://example.com");
    });

    it("strips one or more trailing slashes", () => {
        expect(normalizeSiteUrl("https://example.com/")).toBe("https://example.com");
        expect(normalizeSiteUrl("https://example.com///")).toBe("https://example.com");
    });

    it("keeps a sub-path, minus its trailing slash", () => {
        expect(normalizeSiteUrl("https://example.com/app/")).toBe("https://example.com/app");
    });

    it("trims surrounding whitespace", () => {
        expect(normalizeSiteUrl("  https://example.com/ \n")).toBe("https://example.com");
    });

    it("falls back to the default when unset, empty or only slashes", () => {
        expect(normalizeSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
        expect(normalizeSiteUrl("")).toBe(DEFAULT_SITE_URL);
        expect(normalizeSiteUrl("/")).toBe(DEFAULT_SITE_URL);
    });
});

// The source (constants/site.ts) and its most visible consumer (robots.txt): no double slash.
describe("SITE_URL with a trailing slash in NEXT_PUBLIC_SITE_URL", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it("is normalized at the source and robots.txt points to a single-slash sitemap", async () => {
        vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
        vi.resetModules();
        const { SITE_URL } = await import("@/constants/site");
        const { default: robots } = await import("@/app/robots");
        expect(SITE_URL).toBe("https://example.com");
        expect(robots().sitemap).toBe("https://example.com/sitemap.xml");
    });
});
