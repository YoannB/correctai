import { Corrector } from "@/components/home/Corrector";
import { Faq } from "@/components/home/Faq";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { SeoResources } from "@/components/home/SeoResources";
import { ToolHero } from "@/components/home/ToolHero";
import { PageShell } from "@/components/layout/PageShell";

// Static Server Component. The tool (Corrector) is a Client Component reading the locale
// through the NextIntlClientProvider set in the layout. No request read here, so the route
// stays prerendered by the layout's generateStaticParams.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return (
        <PageShell>
            <ToolHero locale={locale} />
            <Corrector />
            <FeatureStrip />
            <SeoResources />
            <Faq />
        </PageShell>
    );
}
