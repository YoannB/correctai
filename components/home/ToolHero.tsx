import { getTranslations } from "next-intl/server";

// CorrectAI hero: centered title (accent words in an animated gradient) + two subtitle lines.
// Server Component: pure copy, nothing interactive.
export async function ToolHero({ locale }: { locale: string }) {
    const t = await getTranslations({ locale, namespace: "toolHero" });
    return (
        <header className="tool-hero">
            <h1 className="tool-hero__title">
                {t("titleLead")} <span className="tool-hero__accent">{t("titleAccent")}</span>
            </h1>
            <p className="tool-hero__sub">
                {t.rich("subtitle", { ai: (chunks) => <b className="tool-hero__ai">{chunks}</b> })}
            </p>
            <p className="tool-hero__tagline">{t("tagline")}</p>
        </header>
    );
}
