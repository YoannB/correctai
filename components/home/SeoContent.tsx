"use client";
import { VideoEmbed } from "@/components/content/VideoEmbed";
import { AdSlot, Chip, Icon, Section } from "@/components/ui";
import { AD_SIZES, HERO_VIDEO_ID, SEO_RESOURCES } from "@/constants/site";
import { useDetachOnScroll } from "@/hooks/use-detach-on-scroll";
import { useFooterClearance } from "@/hooks/use-footer-clearance";
import { useAppState, useStore } from "@/hooks/use-store";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

const LAW = SEO_RESOURCES.find((r) => r.kind === "article");
const VIDEO = SEO_RESOURCES.find((r) => r.kind === "video");

// CorrectAI SEO block: "fix without rewriting" (how-to), the EU AI Act art. 50 summary next to a
// SHORT video that detaches on scroll (same geometry contract as Axons' SeoResources, see
// docs/seo-layout.md → Detach-on-scroll video player), then the data-protection note.
// The FAQ is a separate section (components/home/Faq.tsx).
export function SeoContent() {
    const t = useTranslations("seoContent");
    const tc = useTranslations("common");
    const steps = t.raw("steps") as { title: string; text: string }[];
    const chips = t.raw("chips") as string[];
    const bullets = t.raw("law.bullets") as string[];
    const { sentinelRef, mode } = useDetachOnScroll();
    const store = useStore();
    const { videoDismissed } = useAppState();
    const pinned = mode === "fixed" && !videoDismissed;
    useFooterClearance(pinned);

    return (
        <Section id="seo" title={t("heading")} className="seo seo-content">
            <p className="seo-content__intro muted">{t("intro")}</p>
            <ol className="seo-content__steps">
                {steps.map((s) => (
                    <li key={s.title}>
                        <strong>{s.title}.</strong> {s.text}
                    </li>
                ))}
            </ol>
            <div className="seo-content__chips">
                {chips.map((c, i) => (
                    <Chip
                        key={c}
                        label={c}
                        icon={<Icon name={(["check", "shield", "clock"] as const)[i]} size={14} />}
                    />
                ))}
            </div>
            <AdSlot {...AD_SIZES.horizontal} label="seo-top" />

            <h2 className="seo-content__h2">{t("law.heading")}</h2>
            <p className="muted">{t("law.intro")}</p>
            <div className="seo-content__law">
                <div className="seo__video-block seo-content__video">
                    <span ref={sentinelRef} className="seo-sentinel" aria-hidden="true" />
                    <div className={cn("seo-video-slot seo-video-slot--short", pinned && "is-pinned")}>
                        <div className="seo-video-placeholder" aria-hidden="true" />
                        <div className="seo-video">
                            <button
                                type="button"
                                className="seo-video-close"
                                aria-label={tc("close")}
                                onClick={() => store.dismissVideo()}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                            <VideoEmbed videoId={HERO_VIDEO_ID} short caption={t("law.videoTitle")} />
                        </div>
                    </div>
                </div>
                <ul className="seo-content__bullets">
                    {bullets.map((b) => (
                        <li key={b}>{b}</li>
                    ))}
                </ul>
            </div>
            <p className="seo-content__links">
                {LAW ? (
                    <a href={LAW.url} target="_blank" rel="noopener noreferrer">
                        {t("law.linkLaw")}
                    </a>
                ) : null}
                {VIDEO ? (
                    <>
                        {" · "}
                        <a href={VIDEO.url} target="_blank" rel="noopener noreferrer">
                            {t("law.linkVideo")}
                        </a>
                    </>
                ) : null}
            </p>
            <AdSlot {...AD_SIZES.horizontal} label="seo-bottom" />
        </Section>
    );
}

// "Your data" note closing the page (after the FAQ, as on the POC).
export function DataNote() {
    const t = useTranslations("seoContent");
    return (
        <Section id="data" title={t("data.heading")} className="seo-content seo-content--data">
            <p className="muted">{t("data.text")}</p>
            <p className="seo-content__links">
                <Link href="/privacy">{t("links.privacy")}</Link>
                {" · "}
                <Link href="/cookies">{t("links.cookies")}</Link>
                {" · "}
                <Link href="/sitemap">{t("links.sitemap")}</Link>
            </p>
        </Section>
    );
}
