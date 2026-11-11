import { LOCALES as SERVED_LOCALES } from "@/i18n/locales";
import { resolveTimeZone } from "@/lib/day";
import { isAiEnabled, isConsentRequired } from "@/lib/flags";

export const SITE_NAME = "CorrectAI";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const AI_DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_LIMIT ?? 0) || 0;
// AI feature switch. NEXT_PUBLIC_AI_ENABLED is computed by next.config.ts at build time from the
// PRESENCE of OPENROUTER_API_KEY (only the boolean reaches the client, never the key). No key or a
// daily limit of 0 => every AI surface (buttons, counter, notices, dev reset) is hidden.
export const AI_ENABLED = isAiEnabled(process.env.NEXT_PUBLIC_AI_ENABLED, AI_DAILY_LIMIT);
// Time zone of the AI "day" (client counter AND server quota keys): empty => UTC.
export const AI_QUOTA_TZ = resolveTimeZone(process.env.NEXT_PUBLIC_AI_QUOTA_TZ);
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";
// The cookie banner exists only when a tracker that needs consent is configured (CNIL: no
// banner theatre when the site sets no such tracker; functional storage needs none).
export const CONSENT_REQUIRED = isConsentRequired({ gtmId: GTM_ID, adsEnabled: ADS_ENABLED });
export const GITHUB_URL = "https://github.com/YoannB/correctai";

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

const ALL_NAV = [
    { href: "/", key: "nav.home" },
    { href: "/articles", key: "nav.articles" },
    { href: "/sitemap", key: "nav.sitemap" },
    { href: "/legal", key: "nav.legal" },
    { href: "/privacy", key: "nav.privacy" },
    { href: "/cookies", key: "nav.cookies" },
] as const;
export const NAV = ALL_NAV.filter((n) => ARTICLES_ENABLED || n.href !== "/articles");

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
export const SEO_RESOURCES: SeoResource[] = [
    {
        id: "yt",
        kind: "video",
        url: "https://www.youtube.com/watch?v=jzdTBDmCAKE",
        videoId: "jzdTBDmCAKE",
        short: false,
        mark: "YT",
        titleKey: "seo.a1.title",
        summaryKey: "seo.a1.summary",
        sourceKey: "seo.a1.source",
        durationKey: "seo.a1.duration",
    },
    {
        id: "oc",
        kind: "article",
        url: "https://openclassrooms.com/fr/courses/8710351-creez-une-application-react-avec-next-js/8856186-demarrez-un-projet-next-js",
        mark: "OC",
        titleKey: "seo.a2.title",
        summaryKey: "seo.a2.summary",
        sourceKey: "seo.a2.source",
        durationKey: "seo.a2.duration",
    },
    {
        id: "ti",
        kind: "article",
        url: "https://tech-insider.org/fr/nextjs-16-tutoriel-app-full-stack-13-etapes-2026/",
        mark: "TI",
        titleKey: "seo.a3.title",
        summaryKey: "seo.a3.summary",
        sourceKey: "seo.a3.source",
        durationKey: "seo.a3.duration",
    },
];
export const HERO_VIDEO_ID = "jzdTBDmCAKE";

// SYMMETRIC, THIN vertical rails (160x600): symmetry kept (the 160/300
// asymmetry looked bad) AND breathing room in the center (~912px on a 1280 container) => the
// feature-strip and the hero are no longer squashed. Do NOT go back to 300: 300+300 steals
// 600px from the content and squeezes the feature-strip.
export const AD_SIZES = {
    verticalRight: { w: 160, h: 600 },
    verticalLeft: { w: 160, h: 600 },
    horizontal: { w: 728, h: 90 },
} as const;
