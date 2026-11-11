import { SITE_NAME, SITE_URL } from "@/constants/site";
import { getPathname } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

// schema.org graph of the home (as on the POC): the free web app, the 3-step how-to and the FAQ.
// Server-rendered; `<` is escaped so no message text can close the script element.
export async function HomeJsonLd({ locale }: { locale: string }) {
    const t = await getTranslations({ locale, namespace: "seoContent" });
    const tf = await getTranslations({ locale, namespace: "faq" });
    const tm = await getTranslations({ locale, namespace: "meta.home" });
    const steps = t.raw("steps") as { title: string; text: string }[];
    const faq = tf.raw("items") as { q: string; a: string }[];
    const url = new URL(getPathname({ locale, href: "/" }), SITE_URL).toString();
    const graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                name: SITE_NAME,
                applicationCategory: "UtilitiesApplication",
                operatingSystem: "Web",
                url,
                inLanguage: locale,
                offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
                description: tm("description"),
            },
            {
                "@type": "HowTo",
                name: t("heading"),
                step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.text })),
            },
            {
                "@type": "FAQPage",
                mainEntity: faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
            },
        ],
    };
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
        />
    );
}
