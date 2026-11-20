import { ArticleFeed } from "@/components/content/ArticleFeed";
import { Section } from "@/components/ui";
import { collectionRules, getCollection } from "@/constants/site";
import { Link } from "@/i18n/routing";
import { getEntries } from "@/lib/articles/source";
import { pickLatest } from "@/lib/articles/status";
import type { LogicalHref } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

const LATEST_COUNT = 3;

// Server Component: the 3 most recent NON-archived entries of a collection (default: Axons'
// articles) in `locale`, titled `latestTitle`. When every entry is an archive, the 3 most recent
// archives under `archivesTitle` instead: old content is never presented as news. Renders nothing
// without entries or when the collection is disabled (ARTICLES_ENABLED for the articles).
export async function LatestArticles({ locale, collection = "articles" }: { locale: string; collection?: string }) {
    const config = getCollection(collection);
    if (!config.enabled) return null;
    const { archive, items } = pickLatest(getEntries(config.id, locale), collectionRules(config), LATEST_COUNT);
    if (!items.length) return null;
    const t = await getTranslations({ locale, namespace: config.namespace });
    return (
        <Section
            id={config.id === "articles" ? "latest-articles" : `latest-${config.id}`}
            title={t(archive ? "archivesTitle" : "latestTitle")}
            className="latest-articles"
        >
            <ArticleFeed items={items} locale={locale} headingLevel="h3" collection={config.id} />
            <Link href={config.href as LogicalHref} className="latest-articles__all">
                {t("viewAll")} →
            </Link>
        </Section>
    );
}
