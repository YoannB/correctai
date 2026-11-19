import { ArticleBody } from "@/components/content/ArticleBody";
import { ArticleFeed } from "@/components/content/ArticleFeed";
import { badgesFor, EntryBadges } from "@/components/content/EntryBadges";
import { EntryComments } from "@/components/content/EntryComments";
import { StaticPage } from "@/components/content/StaticPage";
import { collectionComments, collectionRules, COMMENTS, getCollection, SITE_NAME } from "@/constants/site";
import { getPathname } from "@/i18n/routing";
import { collectionToday, getEntries, getEntry } from "@/lib/articles/source";
import { entryStatus } from "@/lib/articles/status";
import { disqusThreadConfig } from "@/lib/comments";
import { articleJsonLd, articleMetadata, entryUrl, pageMetadata, type EntryHref, type LogicalHref } from "@/lib/seo";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

// Page FACTORIES of a Markdown collection (the articles, "reminders"…). Next routes are
// files, so each collection keeps two page files that only delegate here (see the articles ones):
//   app/[locale]/<route>/page.tsx         → collectionListing("<id>"): generateMetadata + Page
//   app/[locale]/<route>/[slug]/page.tsx  → collectionEntry("<id>"): generateMetadata + Page
// A disabled collection answers notFound() everywhere. docs/articles.md.
//
// NO generateStaticParams on the entry route, on purpose: every route under [locale] renders on
// demand (the root layout resolves the locale per request), so it never prerendered anything, and
// when a served locale has NO entry Next then classified the route as SSG and every entry page
// failed at run time (500, DYNAMIC_SERVER_USAGE). Unknown slugs hit notFound() in the page.

type LocaleParams = Promise<{ locale: string }>;
type EntryParams = Promise<{ locale: string; slug: string }>;

export function collectionListing(id: string) {
    const collection = getCollection(id);
    const href = collection.href as LogicalHref;

    async function generateMetadata({ params }: { params: LocaleParams }) {
        const { locale } = await params;
        if (!collection.enabled) notFound();
        const t = await getTranslations({ locale, namespace: collection.namespace });
        return pageMetadata({ title: t("title"), description: t("intro"), href, locale });
    }

    // Static listing (prerendered per locale by the segment layout's generateStaticParams).
    // Entries missing in this locale are listed in their fallback language, linking to their own URL.
    async function Page({ params }: { params: LocaleParams }) {
        const { locale } = await params;
        if (!collection.enabled) notFound();
        const t = await getTranslations({ locale, namespace: collection.namespace });
        const ts = await getTranslations({ locale, namespace: "showcase" });
        const items = getEntries(collection.id, locale);
        return (
            <StaticPage
                title={t("title")}
                intro={t("intro")}
                crumbs={[{ label: ts("bcHome"), href: getPathname({ locale, href: "/" }) }, { label: t("title") }]}
                body={
                    items.length ? (
                        <ArticleFeed items={items} locale={locale} collection={collection.id} />
                    ) : (
                        <p>{t("empty")}</p>
                    )
                }
            />
        );
    }

    return { generateMetadata, Page };
}

export function collectionEntry(id: string) {
    const collection = getCollection(id);
    const href = collection.href as LogicalHref;
    const itemHref = collection.itemHref as EntryHref;

    // One page per translation, under ITS locale's slug; any other slug hits notFound().
    async function generateMetadata({ params }: { params: EntryParams }) {
        const { locale, slug } = await params;
        const entry = collection.enabled ? getEntry(collection.id, locale, slug) : undefined;
        if (!entry) notFound();
        return articleMetadata(entry, locale, itemHref);
    }

    async function Page({ params }: { params: EntryParams }) {
        const { locale, slug } = await params;
        const entry = collection.enabled ? getEntry(collection.id, locale, slug) : undefined;
        if (!entry) notFound();
        const article = entry.translations[locale];
        const t = await getTranslations({ locale, namespace: collection.namespace });
        const ts = await getTranslations({ locale, namespace: "showcase" });
        const format = await getFormatter({ locale });
        const published = format.dateTime(new Date(`${article.date}T00:00:00Z`), {
            dateStyle: "long",
            timeZone: "UTC",
        });
        const tb = await getTranslations({ locale, namespace: "entryStatus" });
        const status = entryStatus(article, collectionRules(collection), await collectionToday(locale));
        const badges = badgesFor(status, { new: tb("new"), archive: tb("archive") });
        const jsonLd = articleJsonLd(entry, locale, SITE_NAME, { itemHref, schemaType: collection.schemaType });
        // Comments: only under a NON-archived entry of a collection that has them (docs/articles.md
        // → Comments). One thread per translation, keyed by collection/entry id/locale, not by URL.
        const comments =
            COMMENTS && collectionComments(collection) && !status.isArchived
                ? {
                      shortname: COMMENTS.shortname,
                      config: disqusThreadConfig({
                          collection: collection.id,
                          entryId: entry.id,
                          locale,
                          url: entryUrl(itemHref, locale, article.slug),
                          title: article.title,
                      }),
                  }
                : null;

        return (
            <>
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
                <StaticPage
                    title={article.title}
                    intro={article.description}
                    crumbs={[
                        { label: ts("bcHome"), href: getPathname({ locale, href: "/" }) },
                        { label: t("title"), href: getPathname({ locale, href }) },
                        { label: article.title },
                    ]}
                    body={
                        <>
                            <article className="article">
                                {/* A div, not a <p>: the Chip renders a <div>. */}
                                <div className="article__meta muted">
                                    <time dateTime={article.date}>{t("publishedOn", { date: published })}</time>
                                    <EntryBadges badges={badges} />
                                </div>
                                {status.isArchived ? (
                                    <p className="article__archive-notice">{tb("archiveNotice")}</p>
                                ) : null}
                                {article.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- static public asset of unknown size
                                    <img src={article.image} alt="" className="article__cover" />
                                ) : null}
                                <ArticleBody markdown={article.body} />
                            </article>
                            {comments ? (
                                <EntryComments shortname={comments.shortname} config={comments.config} />
                            ) : null}
                        </>
                    }
                />
            </>
        );
    }

    return { generateMetadata, Page };
}
