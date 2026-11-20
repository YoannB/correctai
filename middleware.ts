// middleware.ts — next-intl locale routing, ACTIVE in production.
// Next 16 recommends proxy.ts, but the Netlify adapter does not support that convention yet:
// middleware.ts is kept (the build-time deprecation warning is expected) and
// proxy.ts.disabled stays parked with the same matcher. Switch the day the adapter
// supports proxy: rename proxy.ts.disabled -> proxy.ts and delete this file.
// See docs/architecture.md (i18n/middleware/proxy divergence).
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
    // Same matcher as proxy.ts: excludes API, tRPC, _next, _vercel and
    // paths containing a dot (assets, the app/icon.svg favicon). Adapt it if the app has routes
    // with a dot. The social images (/og/<locale>/….png, app/og/) rely on the dot rule to stay
    // unlocalized.
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
