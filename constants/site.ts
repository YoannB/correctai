import { LOCALES as SERVED_LOCALES } from "../i18n/locales";
import {
    findCollection,
    hiddenHrefs,
    validateCollections,
    type CollectionConfig,
    type CollectionDefaults,
} from "../lib/articles/collections";
import { resolveRules, validateRules, type ResolvedRules } from "../lib/articles/status";
import {
    collectionHasComments,
    commentsActive,
    resolveComments,
    validateCommentsSwitch,
    type SiteComments,
} from "../lib/comments";
import { resolveTimeZone } from "../lib/day";
import { isAiEnabled, isConsentRequired } from "../lib/flags";
import { buildOgPages } from "../lib/og/model";
import { normalizeSiteUrl } from "../lib/site-url";

// RELATIVE imports only (never `@/`): next.config.ts imports this file, and the config loader
// does not resolve `@/` aliases in the files it imports.
//
// The site's identity and configuration, as plain values. The copy lives in
// messages/<locale>.json, the colour tokens in styles/tokens.css, the favicon in app/icon.svg and
// the logo drawing in components/ui/Logo.tsx.

export const SITE_NAME = "CorrectAI";
/** Root metadata fallbacks (pages set their own localized title/description). */
export const DEFAULT_TITLE = "CorrectAI – AI spelling & grammar checker";
export const DEFAULT_DESCRIPTION = "Fix spelling, grammar and punctuation with AI without changing your style.";
export const GITHUB_URL = "https://github.com/YoannB/correctai";
// Never ends with "/" (lib/site-url.ts): consumers append paths to it.
export const SITE_URL: string = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const AI_DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_LIMIT ?? 0) || 0;
// AI feature switch. NEXT_PUBLIC_AI_ENABLED is computed by next.config.ts at build time from the
// PRESENCE of OPENROUTER_API_KEY (only the boolean reaches the client, never the key). No key or a
// daily limit of 0 => every AI surface (buttons, counter, notices, dev reset) is hidden.
export const AI_ENABLED = isAiEnabled(process.env.NEXT_PUBLIC_AI_ENABLED, AI_DAILY_LIMIT);
// Time zone of the AI "day" (client counter AND server quota keys): empty => UTC.
export const AI_QUOTA_TZ = resolveTimeZone(process.env.NEXT_PUBLIC_AI_QUOTA_TZ);
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";

// Site chrome switches. CorrectAI is a one-page tool: no header nav (the footer and the HTML
// sitemap still list every page) and no GitHub links.
export const HEADER_NAV_ENABLED: boolean = false;
export const GITHUB_LINK_ENABLED: boolean = false;
/** Brand word: SITE_NAME[0..BRAND_ACCENT_FROM) plain, the rest accented ("Correct" + "AI"). */
export const BRAND_ACCENT_FROM: number = 7;

/** MUI colours of one theme mode (hex): primary/secondary main and the text drawn ON the primary. */
export interface PaletteMode {
    readonly primary: string;
    readonly secondary: string;
    readonly contrastText: string;
}
// MUI palette per mode (buttons, chips, focus rings…), read by components/ui/material/theme.ts.
// The CSS tokens (--accent-1, --bg-0, --btn-fg…) live in styles/tokens.css: keep both in step.
export const PALETTE: { readonly dark: PaletteMode; readonly light: PaletteMode } = {
    dark: { primary: "#7c5cff", secondary: "#22d3ee", contrastText: "#fff" },
    light: { primary: "#7c5cff", secondary: "#22d3ee", contrastText: "#fff" },
};

/**
 * What the pre-hydration splash (`#app-splash`, rendered by app/layout.tsx) shows: `logo` = the
 * logo (class `.splash-logo`, animated by CSS) above the bar; `bar` = the animated progress bar
 * (docs/seo-layout.md → Pre-hydration splash).
 */
export const SPLASH: { readonly logo: boolean; readonly bar: boolean } = { logo: false, bar: true };

export type LocaleCode = "fr" | "en" | "es" | "de" | "it" | "pt";
export interface LocaleMeta {
    code: LocaleCode;
    native: string;
    flag: string;
    active: boolean;
}

// Display metadata of every SUPPORTED locale. `active` = served on this site (NEXT_PUBLIC_LOCALES,
// single source in i18n/locales.ts): the language switcher lists active locales only.
const LOCALE_META: Omit<LocaleMeta, "active">[] = [
    { code: "fr", native: "Français", flag: "🇫🇷" },
    { code: "en", native: "English", flag: "🇬🇧" },
    { code: "es", native: "Español", flag: "🇪🇸" },
    { code: "de", native: "Deutsch", flag: "🇩🇪" },
    { code: "it", native: "Italiano", flag: "🇮🇹" },
    { code: "pt", native: "Português", flag: "🇵🇹" },
];
export const LOCALES: LocaleMeta[] = LOCALE_META.map((l) => ({
    ...l,
    active: (SERVED_LOCALES as readonly string[]).includes(l.code),
}));

// Markdown articles section (listing, article pages, home "latest articles" block, nav entry and
// sitemap entries). false => every article surface disappears and /articles answers 404; the
// files in content/articles/ stay in the repo but are not published. See docs/articles.md.
export const ARTICLES_ENABLED: boolean = false;

// Markdown collections: the articles (the default collection, switched by ARTICLES_ENABLED), then
// any other one, e.g. { id: "reminders", enabled: true, href: "/reminders", itemHref:
// "/reminders/[slug]", namespace: "pages.reminders", schemaType: "TechArticle" } + content/reminders/
// + both routes in i18n/pathnames.ts + two page files (docs/articles.md → Collections).
export const ARTICLES_COLLECTION = {
    id: "articles",
    enabled: ARTICLES_ENABLED,
    href: "/articles",
    itemHref: "/articles/[slug]",
    namespace: "pages.articles",
    schemaType: "BlogPosting",
} as const satisfies CollectionConfig;
export const COLLECTIONS = validateCollections([ARTICLES_COLLECTION]);
export type Collection = (typeof COLLECTIONS)[number];
export const getCollection = (id: string): Collection => findCollection(COLLECTIONS, id);
// "New" / "Archive" badge rules and comments switch of EVERY collection; a collection's own value
// wins. e.g. { newForDays: 90, archiveBefore: "2018-01-01" }. No rule => no badge
// (docs/articles.md → New and archive badges). `comments: true` shows comments under the
// non-archived entries, ACTIVE ONLY with a Disqus shortname (see COMMENTS below).
export const COLLECTION_DEFAULTS: CollectionDefaults = { comments: true };
validateRules(COLLECTION_DEFAULTS, "COLLECTION_DEFAULTS");
validateCommentsSwitch(COLLECTION_DEFAULTS, "COLLECTION_DEFAULTS");
/** Badge rules of a collection: its own newForDays / archiveBefore, else the site defaults. */
export const collectionRules = (collection: CollectionConfig): ResolvedRules =>
    resolveRules(collection, COLLECTION_DEFAULTS);
/** Routes of the disabled collections (nav and sitemap.xml skip them). */
export const HIDDEN_HREFS: readonly string[] = hiddenHrefs(COLLECTIONS);
export const ENABLED_COLLECTIONS = COLLECTIONS.filter((c) => c.enabled);

// Footer + HTML sitemap: every entry, in this order (labels: messages `nav.<id>`). A disabled
// collection drops its entry. Header: HEADER_NAV (an entry with `header: false` stays out of it,
// keeping the header short).
interface NavEntry {
    readonly href: string;
    readonly key: string;
    readonly header?: boolean;
}
const ALL_NAV = [
    { href: "/", key: "nav.home" },
    { href: "/articles", key: "nav.articles" },
    { href: "/sitemap", key: "nav.sitemap" },
    { href: "/legal", key: "nav.legal" },
    { href: "/privacy", key: "nav.privacy" },
    { href: "/cookies", key: "nav.cookies" },
] as const satisfies readonly NavEntry[];
export const NAV: readonly (NavEntry & (typeof ALL_NAV)[number])[] = ALL_NAV.filter(
    (n) => !HIDDEN_HREFS.includes(n.href),
);
export const HEADER_NAV = NAV.filter((n) => n.header !== false);

// Comments under collection entries (docs/articles.md → Comments). The shortname:
// NEXT_PUBLIC_DISQUS_SHORTNAME (inlined at build) wins over COMMENTS_PROVIDER.shortname; none =>
// off (COMMENTS null). COMMENTS_ENABLED = at least one enabled collection shows them (next.config.ts
// then widens the CSP to Disqus).
const COMMENTS_PROVIDER: SiteComments = { provider: "disqus" };
export const COMMENTS = resolveComments(COMMENTS_PROVIDER, process.env.NEXT_PUBLIC_DISQUS_SHORTNAME);
export const COMMENTS_ENABLED: boolean = commentsActive(COMMENTS, COLLECTIONS, COLLECTION_DEFAULTS);
/** Does this collection show comments under its non-archived entries? */
export const collectionComments = (collection: CollectionConfig): boolean =>
    collectionHasComments(COMMENTS, collection, COLLECTION_DEFAULTS);
// The cookie banner exists only when a tracker that needs consent is configured (CNIL: no
// banner theatre when the site sets no such tracker; functional storage needs none).
export const CONSENT_REQUIRED = isConsentRequired({
    gtmId: GTM_ID,
    adsEnabled: ADS_ENABLED,
    commentsEnabled: COMMENTS_ENABLED,
});

// Pages with their OWN social image (logical href → messages namespace with title + description
// or intro), then the enabled collection listings. Entries of enabled collections are automatic;
// any other page shares the home image (lib/seo.ts, docs/seo-layout.md → Social images).
export const OG_PAGES: Readonly<Record<string, string>> = buildOgPages(
    {
        "/": "meta.home",
        "/sitemap": "pages.sitemap",
        "/legal": "pages.legal",
        "/privacy": "pages.privacy",
        "/cookies": "pages.cookies",
    },
    Object.fromEntries(ENABLED_COLLECTIONS.map((c) => [c.href, c.namespace])),
);

export interface SeoResource {
    id: string;
    kind: "video" | "article";
    url: string;
    videoId?: string;
    short?: boolean;
    mark: string;
    titleKey: string;
    summaryKey: string;
    sourceKey: string;
    durationKey: string;
}
// CorrectAI: third-party references used by the SEO block (components/home/SeoContent.tsx).
// Written by others, linked for the reader (and for SEO): the official article 50 summary and
// a short video about it. Copy keys live under messages → seoContent.law.
export const SEO_RESOURCES: readonly SeoResource[] = [
    {
        id: "yt",
        kind: "video",
        url: "https://www.youtube.com/shorts/mNib6lbM-b8",
        videoId: "mNib6lbM-b8",
        short: true,
        mark: "YT",
        titleKey: "seoContent.law.videoTitle",
        summaryKey: "seoContent.law.intro",
        sourceKey: "seoContent.law.linkVideo",
        durationKey: "seoContent.law.linkVideo",
    },
    {
        id: "ai-act-50",
        kind: "article",
        url: "https://artificialintelligenceact.eu/fr/transparency-rules-article-50/",
        mark: "EU",
        titleKey: "seoContent.law.heading",
        summaryKey: "seoContent.law.intro",
        sourceKey: "seoContent.law.source",
        durationKey: "seoContent.law.source",
    },
];
/** Hero video of the SEO block (the article 50 short). */
export const HERO_VIDEO_ID: string = "mNib6lbM-b8";

// SYMMETRIC, THIN vertical rails (160x600): symmetry kept (the 160/300
// asymmetry looked bad) AND breathing room in the center (~912px on a 1280 container) => the
// feature-strip and the hero are no longer squashed. Do NOT go back to 300: 300+300 steals
// 600px from the content and squeezes the feature-strip.
export const AD_SIZES = {
    verticalRight: { w: 160, h: 600 },
    verticalLeft: { w: 160, h: 600 },
    horizontal: { w: 728, h: 90 },
} as const;
