import { ArticleTeaser } from "@/components/content/ArticleTeaser";
import { badgesFor } from "@/components/content/EntryBadges";
import { collectionRules, getCollection, LOCALES } from "@/constants/site";
import type { AppLocale } from "@/i18n/locales";
import type { ListedArticle } from "@/lib/articles/parse";
import { collectionToday } from "@/lib/articles/source";
import { entryStatus } from "@/lib/articles/status";
import type { EntryHref } from "@/lib/seo";
import { getFormatter, getTranslations } from "next-intl/server";

// Server Component: list of entry teasers of a collection for `locale` (listing page and home
// block). Dates are formatted by next-intl in UTC: a front-matter date is a calendar day.
// "New" / "Archive" badges follow the collection's rules (collectionRules), evaluated per request.
export async function ArticleFeed({
    items,
    locale,
    headingLevel,
    collection = "articles",
    namespace,
    itemHref,
}: {
    items: ListedArticle[];
    locale: string;
    headingLevel?: "h2" | "h3";
    // Collection id (default: the articles): its messages namespace, entry route and badge rules.
    collection?: string;
    // Overrides of the collection's namespace and entry route (historical props).
    namespace?: string;
    itemHref?: EntryHref;
}) {
    const config = getCollection(collection);
    const rules = collectionRules(config);
    const format = await getFormatter({ locale });
    const t = await getTranslations({ locale, namespace: namespace ?? config.namespace });
    const ts = await getTranslations({ locale, namespace: "entryStatus" });
    const labels = { new: ts("new"), archive: ts("archive") };
    const today = await collectionToday(locale);
    return (
        <div className="article-feed">
            {items.map(({ article, isFallback }) => {
                const meta = LOCALES.find((l) => l.code === article.locale);
                const dateLabel = t("publishedOn", {
                    date: format.dateTime(new Date(`${article.date}T00:00:00Z`), {
                        dateStyle: "long",
                        timeZone: "UTC",
                    }),
                });
                return (
                    <ArticleTeaser
                        key={article.id}
                        title={article.title}
                        description={article.description}
                        slug={article.slug}
                        itemHref={itemHref ?? (config.itemHref as EntryHref)}
                        locale={article.locale as AppLocale}
                        date={article.date}
                        dateLabel={dateLabel}
                        image={article.image}
                        headingLevel={headingLevel}
                        collectionLabel={t("title")}
                        badges={badgesFor(entryStatus(article, rules, today), labels)}
                        fallback={
                            isFallback && meta
                                ? {
                                      flag: meta.flag,
                                      label: meta.native,
                                      title: t("onlyIn", { language: meta.native }),
                                  }
                                : undefined
                        }
                    />
                );
            })}
        </div>
    );
}
