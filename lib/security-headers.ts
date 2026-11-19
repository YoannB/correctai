// PURE builder of the HTTP security headers applied by next.config.ts to every route.
// Kept out of next.config.ts so each branch is unit-tested (tests/unit/security-headers.test.ts).

export interface HeaderPair {
    key: string;
    value: string;
}

const SOURCE = /^(?:'self'|'none'|https:\/\/(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*(?::\d{1,5})?)$/i;

/**
 * Origins allowed to embed the site in an iframe, from FRAME_ANCESTORS (space- or
 * comma-separated CSP sources: 'self', 'none', https://host, https://*.host, optional port).
 * Empty => ['self'] (same-origin only, the historical default). An invalid source throws at
 * build time: a typo must not silently open, nor silently close, framing.
 * 'self' is always kept unless the list is exactly 'none'.
 */
export function parseFrameAncestors(raw: string | undefined): string[] {
    const tokens = (raw ?? "")
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    if (tokens.length === 0) return ["'self'"];
    const invalid = tokens.filter((t) => !SOURCE.test(t));
    if (invalid.length > 0) throw new Error(`Invalid FRAME_ANCESTORS: ${invalid.join(", ")}`);
    if (tokens.includes("'none'")) {
        if (tokens.length > 1) throw new Error("FRAME_ANCESTORS: 'none' cannot be combined with any other source");
        return ["'none'"];
    }
    return [...new Set(["'self'", ...tokens])];
}

// Disqus (third-party comments): embed.js from <shortname>.disqus.com, its code, styles and images
// from *.disquscdn.com, the thread itself in an iframe from disqus.com. Added ONLY when comments
// are active (lib/comments.ts), so a site without comments keeps the narrow policy.
const DISQUS = {
    script: ["https://*.disqus.com", "https://*.disquscdn.com"],
    style: ["https://*.disquscdn.com"],
    img: ["https://*.disqus.com", "https://*.disquscdn.com"],
    frame: ["https://disqus.com", "https://*.disqus.com"],
    connect: ["https://*.disqus.com"],
} as const;

export function buildSecurityHeaders(opts: {
    isDev: boolean;
    frameAncestors: string[];
    /** Third-party comments (Disqus) are active: their origins join the CSP. Default false. */
    comments?: boolean;
}): HeaderPair[] {
    const ancestors = opts.frameAncestors;
    const disqus = (kind: keyof typeof DISQUS): string[] => (opts.comments ? [...DISQUS[kind]] : []);
    // X-Frame-Options cannot express an allowlist: it is sent only when it says the same thing as
    // frame-ancestors (old browsers), and dropped when other origins may embed the site (CSP
    // frame-ancestors is authoritative wherever it is supported).
    const sameOriginOnly = ancestors.length === 1 && ancestors[0] === "'self'";
    const noFraming = ancestors.length === 1 && ancestors[0] === "'none'";
    const xfo: HeaderPair[] = sameOriginOnly
        ? [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]
        : noFraming
          ? [{ key: "X-Frame-Options", value: "DENY" }]
          : [];
    return [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ...xfo,
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
            key: "Content-Security-Policy",
            value: [
                "default-src 'self'",
                [
                    "script-src 'self' 'unsafe-inline'",
                    // Development needs 'unsafe-eval' (React rebuilds call stacks via eval()) and
                    // 'wasm-unsafe-eval' (some Turbopack tooling); production drops both.
                    ...(opts.isDev ? ["'unsafe-eval'", "'wasm-unsafe-eval'"] : []),
                    "https://www.googletagmanager.com",
                    "https://www.youtube.com",
                    "https://www.youtube-nocookie.com",
                    ...disqus("script"),
                ].join(" "),
                ["style-src 'self' 'unsafe-inline'", ...disqus("style")].join(" "),
                ["img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com", ...disqus("img")].join(" "),
                [
                    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.googletagmanager.com",
                    ...disqus("frame"),
                ].join(" "),
                [
                    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com",
                    ...disqus("connect"),
                ].join(" "),
                "font-src 'self' data:",
                "base-uri 'self'",
                "form-action 'self'",
                `frame-ancestors ${ancestors.join(" ")}`,
            ].join("; "),
        },
    ];
}
