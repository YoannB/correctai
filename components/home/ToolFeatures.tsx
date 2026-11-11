"use client";
import { Icon } from "@/components/ui";
import type { IconName } from "@/components/ui/types";
import { AI_DAILY_LIMIT, AI_ENABLED } from "@/constants/site";
import { useTranslations } from "next-intl";

const ITEMS: { icon: IconName; k: "quota" | "cookies" | "tier" | "bot"; ai?: boolean }[] = [
    { icon: "clock", k: "quota", ai: true },
    { icon: "cookie", k: "cookies" },
    { icon: "sparkles", k: "tier", ai: true },
    { icon: "shield", k: "bot" },
];

// CorrectAI guarantees strip under the tool (same markup/CSS as Axons' FeatureStrip). The AI
// items disappear with the AI layer (docs/ai-capabilities.md → AI on/off switch).
export function ToolFeatures() {
    const t = useTranslations("toolFeatures");
    return (
        <div className="feature-strip tool-features">
            {ITEMS.filter((it) => !it.ai || AI_ENABLED).map((it) => (
                <div key={it.k} className="feature-strip__item">
                    <span className="feature-strip__ico">
                        <Icon name={it.icon} size={20} />
                    </span>
                    <span className="feature-strip__txt">
                        <b>
                            {it.k === "quota" ? t("quota", { n: AI_DAILY_LIMIT }) : t(it.k, { provider: "OpenRouter" })}
                        </b>
                        <em>{t(`${it.k}Sub`)}</em>
                    </span>
                </div>
            ))}
        </div>
    );
}
