import { LegalSections } from "@/components/content/LegalSections";
import { StaticPage } from "@/components/content/StaticPage";
import type { LegalSection } from "@/lib/legal-sections";
import { pageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "pages.privacy" });
    return pageMetadata({
        title: t("title"),
        description: t("intro").slice(0, 150),
        href: "/privacy",
        locale,
    });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "pages.privacy" });
    const ts = await getTranslations({ locale, namespace: "showcase" });
    // Internal, controlled JSON (t.raw); conditional paragraphs follow the site switches.
    const sections = t.raw("sections") as LegalSection[];
    return (
        <StaticPage
            title={t("title")}
            intro={t("intro")}
            crumbs={[{ label: ts("bcHome"), href: "/" }, { label: t("title") }]}
            body={<LegalSections sections={sections} />}
        />
    );
}
