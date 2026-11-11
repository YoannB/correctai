import { ArticleFeed } from "@/components/content/ArticleFeed";
import { Section } from "@/components/ui";
import { ARTICLES_ENABLED } from "@/constants/site";
import { Link } from "@/i18n/routing";
import { getArticles } from "@/lib/articles/source";
import { getTranslations } from "next-intl/server";

const LATEST_COUNT = 3;

// Server Component: the 3 most recent articles of `locale`; renders nothing without articles
// or when ARTICLES_ENABLED is false.
export async function LatestArticles({ locale }: { locale: string }) {
    if (!ARTICLES_ENABLED) return null;
    const items = getArticles(locale, LATEST_COUNT);
    if (!items.length) return null;
    const t = await getTranslations({ locale, namespace: "pages.articles" });
    return (
        <Section id="latest-articles" title={t("latestTitle")} className="latest-articles">
            <ArticleFeed items={items} locale={locale} headingLevel="h3" />
            <Link href="/articles" className="latest-articles__all">
                {t("viewAll")} →
            </Link>
        </Section>
    );
}
