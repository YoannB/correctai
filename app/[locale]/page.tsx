import { Corrector } from "@/components/home/Corrector";
import { Faq } from "@/components/home/Faq";
import { HomeJsonLd } from "@/components/home/HomeJsonLd";
import { DataNote, SeoContent } from "@/components/home/SeoContent";
import { ToolFeatures } from "@/components/home/ToolFeatures";
import { ToolHero } from "@/components/home/ToolHero";
import { PageShell } from "@/components/layout/PageShell";
import { pageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

// Localized title/description + canonical/hreflang for the home (the root layout only holds
// the site-wide defaults). `absolute` keeps the title free of the "%s · CorrectAI" template.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "meta.home" });
    const meta = pageMetadata({ title: t("title"), description: t("description"), href: "/", locale });
    return { ...meta, title: { absolute: t("title") } };
}

// Static Server Component. The tool (Corrector) is a Client Component reading the locale
// through the NextIntlClientProvider set in the layout. No request read here, so the route
// stays prerendered by the layout's generateStaticParams.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <PageShell>
            <HomeJsonLd locale={locale} />
            <ToolHero locale={locale} />
            <Corrector />
            <ToolFeatures />
            <SeoContent />
            <Faq />
            <DataNote />
        </PageShell>
    );
}
