"use client";
import { Chip, Gauge } from "@/components/ui";
import { BAND_TONES } from "@/constants/corrector";
import { verdictFor } from "@/lib/correct/verdict";
import type { DiffOp } from "@/lib/text/diff";
import { bandFor, similarityPercent } from "@/lib/text/similarity";
import { useTranslations } from "next-intl";

// Similarity score + AI-disclosure verdict of one correction (all derived at render).
export function CorrectorScore({ source, corrected, ops }: { source: string; corrected: string; ops: DiffOp[] }) {
    const t = useTranslations("corrector");
    const percent = similarityPercent(ops, source, corrected);
    const band = bandFor(percent);
    const verdict = verdictFor(ops, percent);
    const tone = BAND_TONES[band.key as keyof typeof BAND_TONES];
    const explain = verdict.requireAiTag
        ? t("explain.tag")
        : verdict.reviewAdvised
          ? t("explain.review")
          : t(`bands.${band.key as keyof typeof BAND_TONES}.message`);

    return (
        <div className={`corrector-score corrector-score--${tone}`}>
            <div className="corrector-score__row">
                <Gauge value={percent} size={64} tone={tone} label={`${percent}%`} />
                <div className="corrector-score__text">
                    <strong className="corrector-score__band">
                        {t(`bands.${band.key as keyof typeof BAND_TONES}.label`)}
                    </strong>
                    <span className="muted">
                        {t("counts", { form: verdict.formCount, content: verdict.contentCount })}
                    </span>
                </div>
                <span
                    className="corrector-score__badge"
                    title={verdict.requireAiTag ? t("tip.tag") : verdict.reviewAdvised ? t("tip.review") : undefined}
                >
                    <Chip
                        color={verdict.requireAiTag ? "warning" : verdict.reviewAdvised ? "info" : "success"}
                        label={
                            verdict.requireAiTag
                                ? t("badge.tag")
                                : verdict.reviewAdvised
                                  ? t("badge.review")
                                  : `➤ ${t("badge.ready")}`
                        }
                    />
                </span>
            </div>
            <p className="corrector-score__explain muted">{explain}</p>
        </div>
    );
}
