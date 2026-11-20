import { Home } from "@/components/home/Home";
import { pageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

// Localized title/description + canonical/hreflang for the home (the root layout only holds
// the site-wide defaults). `absolute` keeps the title free of the "%s · SITE_NAME" template.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "meta.home" });
    const meta = pageMetadata({ title: t("title"), description: t("description"), href: "/", locale });
    return { ...meta, title: { absolute: t("title") } };
}

// Static Server Component: the body is `Home` (components/home/Home.tsx).
// No request read here, so the route stays prerendered by the layout's generateStaticParams.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return <Home locale={locale} />;
}
