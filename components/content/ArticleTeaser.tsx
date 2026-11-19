import { EntryBadges, type EntryBadge } from "@/components/content/EntryBadges";
import { Card } from "@/components/ui";
import type { AppLocale } from "@/i18n/locales";
import { entryPath, type EntryHref } from "@/lib/seo";
import Link from "next/link";

export interface ArticleTeaserProps {
    title: string;
    description: string;
    slug: string;
    // Entry route of the collection (default: the articles).
    itemHref?: EntryHref;
    // Locale of the translation shown: the link goes to THAT translation's own URL.
    locale: AppLocale;
    date: string;
    dateLabel: string;
    image?: string;
    // Set when the visited locale has no translation (fallback): language of the original.
    fallback?: { flag: string; label: string; title: string };
    headingLevel?: "h2" | "h3";
    // "New" / "Archive" status badges (pre-translated), shown next to the date.
    badges?: EntryBadge[];
    // Collection label (pre-translated, e.g. "Articles") shown small on the title cover of an
    // entry without `image`. Optional: absent = the cover shows the title alone.
    collectionLabel?: string;
}

// Internal article preview (listing + "latest articles" block). Server-compatible: no hook,
// every label arrives pre-formatted. Reuses the .article-card look of the SEO resources.
export function ArticleTeaser({
    title,
    description,
    slug,
    itemHref = "/articles/[slug]",
    locale,
    date,
    dateLabel,
    image,
    fallback,
    headingLevel: Heading = "h2",
    badges,
    collectionLabel,
}: ArticleTeaserProps) {
    // The translation's OWN URL, built like the sitemap/hreflang (entryPath → getPathname, which
    // honours localePrefix "as-needed"): no prefix for the default locale. next-intl's <Link> with
    // an explicit `locale` always prefixes (`/fr/articles/…` when fr is the default → 307 on every
    // click). The link only leaves the visited locale for a fallback entry (another language).
    const href = entryPath(itemHref, locale, slug);
    return (
        <Card as="article" className="article-card article-teaser">
            <Link href={href} className="article-card__thumb" tabIndex={-1} aria-hidden="true">
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static public asset of unknown size
                    <img src={image} alt="" className="article-card__img" loading="lazy" />
                ) : (
                    // No cover: a typographic one with the title itself (CSS line-clamp, no JS).
                    // Decorative like the whole thumb link: the real title is the heading below.
                    <span className="article-teaser__cover" lang={fallback ? locale : undefined}>
                        {collectionLabel ? (
                            <span className="article-teaser__cover-kicker">{collectionLabel}</span>
                        ) : null}
                        <span className="article-teaser__cover-title">{title}</span>
                    </span>
                )}
            </Link>
            <div className="article-card__body">
                {/* lang/hrefLang only on a fallback: the title and summary are in another language. */}
                <Heading className="article-teaser__title" lang={fallback ? locale : undefined}>
                    <Link href={href} hrefLang={fallback ? locale : undefined}>
                        {title}
                    </Link>
                </Heading>
                <p className="muted" lang={fallback ? locale : undefined}>
                    {description}
                </p>
                <div className="article-card__meta">
                    <time className="dur" dateTime={date}>
                        {dateLabel}
                    </time>
                    <EntryBadges badges={badges} />
                    {fallback ? (
                        <span className="article-teaser__lang" title={fallback.title}>
                            <span aria-hidden="true">{fallback.flag}</span> {fallback.label}
                        </span>
                    ) : null}
                </div>
            </div>
        </Card>
    );
}
