// @vitest-environment node
import { buildSecurityHeaders, parseFrameAncestors } from "@/lib/security-headers";
import { describe, expect, it } from "vitest";

const header = (h: { key: string; value: string }[], key: string) => h.find((x) => x.key === key)?.value;
const csp = (ancestors: string[], isDev = false) =>
    header(buildSecurityHeaders({ isDev, frameAncestors: ancestors }), "Content-Security-Policy") as string;

describe("parseFrameAncestors — FRAME_ANCESTORS", () => {
    it.each([undefined, "", "  "])("same origin by default (%j)", (raw) => {
        expect(parseFrameAncestors(raw)).toEqual(["'self'"]);
    });
    it("adds https origins (spaces or commas), keeps 'self', deduplicates", () => {
        expect(parseFrameAncestors("https://ezjsdev.netlify.app, https://*.example.com:8443 'self'")).toEqual([
            "'self'",
            "https://ezjsdev.netlify.app",
            "https://*.example.com:8443",
        ]);
    });
    it("'none' alone forbids any framing", () => {
        expect(parseFrameAncestors("'none'")).toEqual(["'none'"]);
    });
    it("'none' combined with another source is an error", () => {
        expect(() => parseFrameAncestors("'none' https://a.dev")).toThrow(/'none' cannot be combined/);
    });
    it.each(["http://insecure.dev", "*", "https://a.dev/path", "javascript:alert(1)"])(
        "rejects an invalid source (%s)",
        (raw) => {
            expect(() => parseFrameAncestors(raw)).toThrow(/Invalid FRAME_ANCESTORS/);
        },
    );
});

describe("buildSecurityHeaders", () => {
    it("same origin: X-Frame-Options SAMEORIGIN + frame-ancestors 'self'", () => {
        const h = buildSecurityHeaders({ isDev: false, frameAncestors: ["'self'"] });
        expect(header(h, "X-Frame-Options")).toBe("SAMEORIGIN");
        expect(csp(["'self'"])).toContain("frame-ancestors 'self'");
    });
    it("'none': X-Frame-Options DENY", () => {
        const h = buildSecurityHeaders({ isDev: false, frameAncestors: ["'none'"] });
        expect(header(h, "X-Frame-Options")).toBe("DENY");
        expect(csp(["'none'"])).toContain("frame-ancestors 'none'");
    });
    it("allow list: no X-Frame-Options (it cannot express it), CSP is authoritative", () => {
        const list = ["'self'", "https://ezjsdev.netlify.app"];
        const h = buildSecurityHeaders({ isDev: false, frameAncestors: list });
        expect(header(h, "X-Frame-Options")).toBeUndefined();
        expect(csp(list)).toContain("frame-ancestors 'self' https://ezjsdev.netlify.app");
    });
    it("eval allowed only in development", () => {
        expect(csp(["'self'"], true)).toContain("'unsafe-eval' 'wasm-unsafe-eval'");
        expect(csp(["'self'"], false)).not.toContain("unsafe-eval");
    });
    it("keeps the base headers", () => {
        const h = buildSecurityHeaders({ isDev: false, frameAncestors: ["'self'"] });
        expect(header(h, "X-Content-Type-Options")).toBe("nosniff");
        expect(header(h, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
        expect(header(h, "Permissions-Policy")).toContain("camera=()");
    });
    it("Disqus origins only when comments are active", () => {
        const off = csp(["'self'"]);
        expect(off).not.toMatch(/disqus/);
        const on = header(
            buildSecurityHeaders({ isDev: false, frameAncestors: ["'self'"], comments: true }),
            "Content-Security-Policy",
        ) as string;
        const directive = (name: string) => on.split("; ").find((d) => d.startsWith(`${name} `)) as string;
        expect(directive("script-src")).toContain("https://*.disqus.com https://*.disquscdn.com");
        expect(directive("style-src")).toContain("https://*.disquscdn.com");
        expect(directive("img-src")).toContain("https://*.disqus.com https://*.disquscdn.com");
        expect(directive("frame-src")).toContain("https://disqus.com https://*.disqus.com");
        expect(directive("connect-src")).toContain("https://*.disqus.com");
        // Everything else is unchanged.
        expect(on.replace(/ https:\/\/(\*\.)?disqus(cdn)?\.com/g, "")).toBe(off);
    });
});
