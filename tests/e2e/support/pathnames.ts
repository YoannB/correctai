import { PATHNAMES } from "../../../i18n/pathnames";
import { lp } from "./locale-path";

/** Served URL of a STATIC logical route in `locale` (`localized("fr", "/sitemap")` -> "/plan-du-site"). */
export function localized(locale: string, href: string): string {
    const entry = (PATHNAMES as Record<string, string | Record<string, string>>)[href];
    if (entry === undefined) throw new Error(`Unknown logical route: ${href}`);
    return lp(locale, typeof entry === "string" ? entry : entry[locale]);
}
