import { LegalSections } from "@/components/content/LegalSections";
import { StaticPage } from "@/components/content/StaticPage";
import type { LegalSection } from "@/lib/legal-sections";
import { pageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "pages.legal" });
    // description = intro (the old "body" key no longer exists in the JSON).
    return pageMetadata({
        title: t("title"),
        description: t("intro").slice(0, 150),
        href: "/legal",
        locale,
    });
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "pages.legal" });
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
