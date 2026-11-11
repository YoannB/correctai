"use client";
import { ADS_ENABLED } from "@/constants/site";

// 100% declarative component: no effect, no setState (complies with
// "You Might Not Need an Effect", react.dev — no external system here).
//
// ABSOLUTE RULE: this component sets NO inline alignment style
// (no textAlign, display, margin or justifyContent).
// It ONLY provides the size (width/height), intrinsic to the ad format.
// All centering (frame in the rail + text in the frame) is handled by the
// .ad-slot / .page-shell__rail CSS classes in styles/layout/. An inline alignment
// here would override the CSS (inline specificity > class): that is exactly what
// prevented flex from applying and stuck the text to the top left.
export interface AdSlotProps {
    w: number;
    h: number;
    label?: string;
}

export function AdSlot({ w, h, label }: AdSlotProps) {
    // Placeholders are a DEVELOPMENT aid only (docs/seo-layout.md → Ads): a production build
    // renders nothing until real tags and consent are wired. NODE_ENV and ADS_ENABLED are both
    // inlined at build time, so server and client render the same tree (no hydration mismatch).
    if (ADS_ENABLED || process.env.NODE_ENV !== "development") {
        // Real integration (AdSense / tag) to come; nothing is rendered until configured,
        // and never without consent (see docs/seo-layout.md).
        return null;
    }
    return (
        <div
            className="ad-slot"
            role="complementary"
            aria-label={label ? `Espace publicitaire ${label}` : "Espace publicitaire"}
            style={{ width: w, height: h }}
        >
            <span className="ad-slot__label">Espace pub</span>
            <span className="ad-slot__size">
                {w}×{h}
            </span>
        </div>
    );
}
