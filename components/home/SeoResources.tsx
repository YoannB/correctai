"use client";
import { ArticleCard } from "@/components/content/ArticleCard";
import { VideoEmbed } from "@/components/content/VideoEmbed";
import { AdSlot, Icon, Section } from "@/components/ui";
import { AD_SIZES, HERO_VIDEO_ID, SEO_RESOURCES } from "@/constants/site";
import { useDetachOnScroll } from "@/hooks/use-detach-on-scroll";
import { useFooterClearance } from "@/hooks/use-footer-clearance";
import { useAppState, useStore } from "@/hooks/use-store";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

// Video block geometry (see use-detach-on-scroll):
//  - .seo-sentinel: absolute, AT THE TOP of the block = top of the video => immediate trigger,
//    independent of the fixed state (no oscillation).
//  - .seo-video-slot: carries the is-pinned class; contains the placeholder (flow height,
//     visible only when pinned) + the video (flow, then fixed). Constant slot height.
//  - .seo-video-caption: rendered HERE (outside VideoEmbed), in the flow, so that placeholder == video
//    to the pixel => no jump of the content below the block when switching.
// CLOSING (close button): `videoDismissed` (in-memory store state, reset on reload) masks the
// hook result (`pinned = mode==='fixed' && !videoDismissed`). Once closed, the
// player NEVER gets is-pinned => it stays in the flow (its original place) and is never
// re-pinned on scroll. This masking changes no geometry => no
// oscillation; placeholder and video share the same 16/9 height => no jump when
// closing. The use-detach-on-scroll hook is therefore UNCHANGED.
export function SeoResources() {
    const t = useTranslations("seo");
    const tc = useTranslations("common"); // existing 'close' key => no messages edit needed
    const { sentinelRef, mode } = useDetachOnScroll();
    const store = useStore();
    const { videoDismissed } = useAppState();
    const pinned = mode === "fixed" && !videoDismissed;
    // The pinned player rises above the footer instead of covering its links (bottom-right).
    useFooterClearance(pinned);
    const articles = SEO_RESOURCES;
    // A short (9:16) hero video gets the portrait slot geometry (seo-video-slot--short).
    const short = SEO_RESOURCES.find((r) => r.kind === "video" && r.videoId === HERO_VIDEO_ID)?.short ?? false;
    return (
        <Section
            id="seo"
            title={
                <>
                    <Icon name="globe" size={20} /> {t("title")}
                </>
            }
            className="seo"
        >
            <div className="seo__video-block">
                <span ref={sentinelRef} className="seo-sentinel" aria-hidden="true" />
                <div className={cn("seo-video-slot", short && "seo-video-slot--short", pinned && "is-pinned")}>
                    <div className="seo-video-placeholder" aria-hidden="true" />
                    <div className="seo-video">
                        {/* Close button: always rendered, but display:none while the slot is not
                is-pinned (see CSS .seo-video-slot .seo-video-close / .is-pinned ...).
                onClick => dismissVideo() => pinned=false => is-pinned removed => the player
                goes back into the flow (its place) and the button disappears by itself. */}
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
                        <VideoEmbed videoId={HERO_VIDEO_ID} short={short} caption={t("videoCaption")} />
                    </div>
                </div>
                <p className="seo-video-caption muted">{t("videoCaption")}</p>
            </div>
            <div className="seo__articles">
                <AdSlot {...AD_SIZES.horizontal} label="seo-top" />
                <div className="seo__articles-grid">
                    {articles.map((r) => (
                        <ArticleCard key={r.id} r={r} />
                    ))}
                </div>
                <AdSlot {...AD_SIZES.horizontal} label="seo-bottom" />
            </div>
        </Section>
    );
}
