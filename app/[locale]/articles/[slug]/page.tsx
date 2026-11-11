import { ArticleBody } from "@/components/content/ArticleBody";
import { StaticPage } from "@/components/content/StaticPage";
import { ARTICLES_ENABLED, SITE_NAME } from "@/constants/site";
import { getPathname } from "@/i18n/routing";
import { getArticle, getCatalog } from "@/lib/articles/source";
import { articleJsonLd, articleMetadata } from "@/lib/seo";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type Params = Promise<{ locale: string; slug: string }>;

// One page per translation, under ITS locale's slug; any other slug hits notFound() below.
export function generateStaticParams({ params }: { params: { locale: string } }) {
    if (!ARTICLES_ENABLED) return [];
    return getCatalog().flatMap((entry) => {
        const article = entry.translations[params.locale];
        return article ? [{ slug: article.slug }] : [];
    });
}

export async function generateMetadata({ params }: { params: Params }) {
    const { locale, slug } = await params;
    const entry = ARTICLES_ENABLED ? getArticle(locale, slug) : undefined;
    if (!entry) notFound();
    return articleMetadata(entry, locale);
}

export default async function ArticlePage({ params }: { params: Params }) {
    const { locale, slug } = await params;
    const entry = ARTICLES_ENABLED ? getArticle(locale, slug) : undefined;
    if (!entry) notFound();
    const article = entry.translations[locale];
    const t = await getTranslations({ locale, namespace: "pages.articles" });
    const ts = await getTranslations({ locale, namespace: "showcase" });
    const format = await getFormatter({ locale });
    const published = format.dateTime(new Date(`${article.date}T00:00:00Z`), { dateStyle: "long", timeZone: "UTC" });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: articleJsonLd(entry, locale, SITE_NAME) }}
            />
            <StaticPage
                title={article.title}
                intro={article.description}
                crumbs={[
                    { label: ts("bcHome"), href: getPathname({ locale, href: "/" }) },
                    { label: t("title"), href: getPathname({ locale, href: "/articles" }) },
                    { label: article.title },
                ]}
                body={
                    <article className="article">
                        <p className="article__meta muted">
                            <time dateTime={article.date}>{t("publishedOn", { date: published })}</time>
                        </p>
                        {article.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- static public asset of unknown size
                            <img src={article.image} alt="" className="article__cover" />
                        ) : null}
                        <ArticleBody markdown={article.body} />
                    </article>
                }
            />
        </>
    );
}
