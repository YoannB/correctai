import { resolveDefaultLocale } from "../../../i18n/locales";

// URLs as the middleware serves them with `localePrefix: "as-needed"` (i18n/routing.ts): the
// DEFAULT locale has no prefix, every other locale does. Specs build URLs with this helper
// instead of hard-coding "/fr/..." so they pass whatever NEXT_PUBLIC_DEFAULT_LOCALE a derived
// site sets (playwright.config.ts loads .env* the same way `next` does).
export const DEFAULT_LOCALE = resolveDefaultLocale(process.env.NEXT_PUBLIC_DEFAULT_LOCALE);

/** `lp("fr", "/plan-du-site")` -> "/plan-du-site" when fr is the default, else "/fr/plan-du-site". */
export function lp(locale: string, path = "/"): string {
    if (locale === DEFAULT_LOCALE) return path;
    return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Anchored regex matching the URL `lp(locale, path)` (for `toHaveURL`). */
export function lpRe(locale: string, path = "/"): RegExp {
    const p = lp(locale, path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^https?://[^/]+${p === "/" ? "/?" : p}$`);
}
