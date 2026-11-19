import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildSecurityHeaders, parseFrameAncestors } from "./lib/security-headers";
import { COMMENTS_ENABLED } from "./constants/site";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Security headers are built by the pure, unit-tested lib/security-headers.ts. 'unsafe-inline' is
// still required for scripts (anti-flash bootScript) and styles (Emotion / Material UI).
// FRAME_ANCESTORS (build-time, server-only): extra origins allowed to embed the site in an iframe
// (e.g. a portfolio showing this app); empty => same-origin only.
// Disqus origins join the CSP only when comments are active (a Disqus shortname + a collection
// that shows them; constants/site.ts, docs/articles.md → Comments).
const securityHeaders = buildSecurityHeaders({
    isDev: process.env.NODE_ENV !== "production",
    frameAncestors: parseFrameAncestors(process.env.FRAME_ANCESTORS),
    comments: COMMENTS_ENABLED,
});

const nextConfig: NextConfig = {
    poweredByHeader: false,
    // Inlined into the client bundle: ONLY a boolean derived from the key's presence, never the
    // key. No key at build time => the AI layer is hidden (constants/site.ts AI_ENABLED).
    env: {
        NEXT_PUBLIC_AI_ENABLED: process.env.OPENROUTER_API_KEY?.trim() ? "true" : "false",
    },
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },
    experimental: {
        optimizePackageImports: ["@mui/material", "@mui/icons-material"],
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "i.ytimg.com",
            },
            {
                protocol: "https",
                hostname: "img.youtube.com",
            },
        ],
    },
};

export default withNextIntl(nextConfig);
