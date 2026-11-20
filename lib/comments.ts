// PURE module (no process.env, no next-intl, no React): comments under collection entries.
// The site declares a provider (constants/site.ts `COMMENTS_PROVIDER`), each collection opts in
// (`comments: true`, or `COLLECTION_DEFAULTS.comments`), and the shortname comes from
// NEXT_PUBLIC_DISQUS_SHORTNAME first, then the provider's `shortname`. No declaration or no
// shortname => comments are off everywhere.
// docs/articles.md → Comments.

/** The comments provider the site uses (`COMMENTS_PROVIDER`). Only Disqus today. */
export interface SiteComments {
    readonly provider: "disqus";
    /**
     * Disqus shortname (Admin → Settings → General). Optional: NEXT_PUBLIC_DISQUS_SHORTNAME, when
     * set, WINS over this value (one build per environment, e.g. a preview forum).
     */
    readonly shortname?: string;
}

/** Comments resolved for the build: provider + the shortname actually used. */
export interface ResolvedComments {
    readonly provider: "disqus";
    readonly shortname: string;
}

/** Per-collection switch (a collection's own value wins over `COLLECTION_DEFAULTS`). */
export interface CommentsSwitch {
    readonly comments?: boolean;
}

// Disqus shortnames: letters, digits and hyphens (no leading/trailing hyphen). The value becomes a
// host name (`<shortname>.disqus.com`), so anything else is rejected at build time.
const SHORTNAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Comments of the build, or null (off). Priority: the env shortname (trimmed, non-empty), then
 * `site.shortname`. The env alone never turns comments on: the site must declare a provider.
 * A malformed shortname throws (build failure), whichever source it came from.
 */
export function resolveComments(
    site: SiteComments | undefined,
    envShortname: string | undefined,
): ResolvedComments | null {
    if (!site) return null;
    const shortname = (envShortname?.trim() || site.shortname?.trim() || "").toLowerCase();
    if (shortname === "") return null;
    if (!SHORTNAME.test(shortname)) {
        throw new Error(`Invalid Disqus shortname "${shortname}": letters, digits and hyphens only.`);
    }
    return { provider: site.provider, shortname };
}

/** Throws (build failure) when `comments` is set to anything but a boolean. */
export function validateCommentsSwitch(value: CommentsSwitch, where: string): void {
    if (value.comments !== undefined && typeof value.comments !== "boolean") {
        throw new Error(`Invalid ${where}: comments must be a boolean (got ${String(value.comments)}).`);
    }
}

/** Does this collection show comments? Needs resolved comments AND the collection's (or default) switch. */
export function collectionHasComments(
    resolved: ResolvedComments | null,
    collection: CommentsSwitch,
    defaults: CommentsSwitch,
): boolean {
    return resolved !== null && (collection.comments ?? defaults.comments ?? false);
}

/** Comments are active on the site when at least one ENABLED collection shows them. */
export function commentsActive(
    resolved: ResolvedComments | null,
    collections: readonly (CommentsSwitch & { readonly enabled: boolean })[],
    defaults: CommentsSwitch,
): boolean {
    return collections.some((c) => c.enabled && collectionHasComments(resolved, c, defaults));
}

/**
 * Stable thread identifier: `<collection>/<entry id>/<locale>`. Independent of the URL and of the
 * translated slug (renaming a slug keeps the thread). One thread PER TRANSLATION: a Disqus thread
 * stores one URL and one title, and readers answer in the page's language, so a shared thread
 * would mix languages and point every notification at a single translation.
 */
export function threadIdentifier(collection: string, entryId: string, locale: string): string {
    return `${collection}/${entryId}/${locale}`;
}

// Disqus interface languages (https://disqus.com/admin/settings/general/ lists them). The app's `pt`
// is European Portuguese (pt-PT), hence `pt_EU`, not `pt_BR`.
const DISQUS_LANGUAGES: Readonly<Record<string, string>> = {
    fr: "fr",
    en: "en",
    es: "es_ES",
    de: "de",
    it: "it",
    pt: "pt_EU",
};

/** Disqus `language` of a site locale; an unknown locale falls back to English. */
export function disqusLanguage(locale: string): string {
    return DISQUS_LANGUAGES[locale] ?? "en";
}

/** What Disqus receives for one entry translation (`DiscussionEmbed` `config`). */
export interface DisqusThreadConfig {
    readonly identifier: string;
    readonly url: string;
    readonly title: string;
    readonly language: string;
}

/** Thread config of one entry translation: stable identifier, absolute canonical URL, title, language. */
export function disqusThreadConfig(opts: {
    collection: string;
    entryId: string;
    locale: string;
    url: string;
    title: string;
}): DisqusThreadConfig {
    return {
        identifier: threadIdentifier(opts.collection, opts.entryId, opts.locale),
        url: opts.url,
        title: opts.title,
        language: disqusLanguage(opts.locale),
    };
}

/** Disqus' own privacy policy, linked from the comments placeholder. */
export const DISQUS_PRIVACY_URL = "https://disqus.com/privacy-policy/";
