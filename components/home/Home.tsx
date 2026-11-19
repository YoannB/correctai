import { Corrector } from "@/components/home/Corrector";
import { Faq } from "@/components/home/Faq";
import { HomeJsonLd } from "@/components/home/HomeJsonLd";
import { DataNote, SeoContent } from "@/components/home/SeoContent";
import { ToolFeatures } from "@/components/home/ToolFeatures";
import { ToolHero } from "@/components/home/ToolHero";
import { PageShell } from "@/components/layout/PageShell";

// The CorrectAI home body, rendered by app/[locale]/page.tsx (which keeps the `meta.home`
// metadata). The tool (Corrector) is a Client Component reading the locale through the
// NextIntlClientProvider set in the layout; ToolHero and HomeJsonLd are Server Components.
export function Home({ locale }: { locale: string }) {
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
