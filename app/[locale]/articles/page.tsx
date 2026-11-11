import { ArticleFeed } from "@/components/content/ArticleFeed";
import { StaticPage } from "@/components/content/StaticPage";
import { ARTICLES_ENABLED } from "@/constants/site";
import { getPathname } from "@/i18n/routing";
import { getArticles } from "@/lib/articles/source";
import { pageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!ARTICLES_ENABLED) notFound();
    const t = await getTranslations({ locale, namespace: "pages.articles" });
    return pageMetadata({ title: t("title"), description: t("intro"), href: "/articles", locale });
}

// Static listing (prerendered per locale by the segment layout's generateStaticParams).
// Articles missing in this locale are listed in their fallback language, linking to their own URL.
export default async function ArticlesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    if (!ARTICLES_ENABLED) notFound();
    const t = await getTranslations({ locale, namespace: "pages.articles" });
    const ts = await getTranslations({ locale, namespace: "showcase" });
    const items = getArticles(locale);
    return (
        <StaticPage
            title={t("title")}
            intro={t("intro")}
            crumbs={[{ label: ts("bcHome"), href: getPathname({ locale, href: "/" }) }, { label: t("title") }]}
            body={items.length ? <ArticleFeed items={items} locale={locale} /> : <p>{t("empty")}</p>}
        />
    );
}
