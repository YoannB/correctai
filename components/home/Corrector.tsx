"use client";
import {
    AiNotice,
    Button,
    ChoiceChips,
    ConfirmDialog,
    CopyButton,
    DiffLegend,
    DiffView,
    EditorPair,
    Icon,
    Textarea,
} from "@/components/ui";
import {
    CORRECT_AGENT_ID,
    DEFAULT_EXAMPLE,
    EDITOR_ROWS,
    EXAMPLE_IDS,
    MAX_CHARS,
    type ExampleId,
} from "@/constants/corrector";
import { AI_ENABLED, LOCALES } from "@/constants/site";
import { useAiCall, type AiCallCtx } from "@/hooks/use-ai-call";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { useElapsedSeconds } from "@/hooks/use-elapsed";
import { useAiPendingSince, useStore } from "@/hooks/use-store";
import { correctionFromReply } from "@/lib/correct/verdict";
import { detectLanguage } from "@/lib/text/detect-language";
import { diffWords } from "@/lib/text/diff";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { CorrectorScore } from "./CorrectorScore";

const END_ID = "corrector-result";
const STACKED = "(max-width: 899px)";

/** What the result pane shows: the text that was corrected, and its correction. */
interface Result {
    source: string;
    corrected: string;
}

// Module level => stable reference for useAiCall (docs/ai-capabilities.md).
const buildBody = ({ locale, input }: AiCallCtx) => ({
    prompt: input ?? "",
    agentId: CORRECT_AGENT_ID,
    inputs: { locale },
});

// The proofreading tool: examples, source textarea, AI call, diff + verdict. State is local
// (nothing persisted, nothing stored server-side); every derived value (diff, staleness,
// dirtiness, detected language) is computed at render — no effect.
export function Corrector() {
    const t = useTranslations("corrector");
    const format = useFormatter();
    const locale = useLocale();
    const store = useStore();

    const exampleText = (id: ExampleId) => ({
        raw: t(`examples.${id}.raw`),
        corrected: t(`examples.${id}.corrected`),
    });

    const [exampleId, setExampleId] = useState<ExampleId | null>(DEFAULT_EXAMPLE);
    const [input, setInput] = useState(() => exampleText(DEFAULT_EXAMPLE).raw);
    const [result, setResult] = useState<Result | null>(() => {
        const ex = exampleText(DEFAULT_EXAMPLE);
        return { source: ex.raw, corrected: ex.corrected };
    });
    // Text sent with the pending call (written in the click handler, read in onSuccess).
    const sentRef = useRef("");
    // Bumped on every accepted AI reply: re-keys the result pane so its "fresh" highlight replays
    // (on an example the pane already shows a text, so the update must be visible).
    const [freshKey, setFreshKey] = useState(0);

    const onSuccess = useCallback(
        (reply: string) => {
            // Free models may skip the JSON envelope (plain text = the correction) or break it.
            // A reply that still looks like the envelope is never shown: returning false makes
            // useAiCall show the error toast and consume no credit; the previous result stays.
            const corrected = correctionFromReply(reply);
            if (corrected === null) return false;
            const source = sentRef.current;
            setResult({ source, corrected });
            setFreshKey((k) => k + 1);
            store.pushToast({
                severity: "success",
                message: corrected.trim() === source.trim() ? t("doneNoChange") : t("done"),
                duration: 4000,
            });
            if (window.matchMedia(STACKED).matches) {
                document.getElementById(END_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
            return true;
        },
        [store, t],
    );
    const { call, pending, canCall } = useAiCall("/api/run", buildBody, onSuccess);
    const elapsed = useElapsedSeconds(useAiPendingSince());

    const loadedRaw = exampleId ? exampleText(exampleId).raw : "";
    const stale = result !== null && input !== result.source;
    // Typed text that was neither loaded from an example nor corrected yet: losing it needs a confirm.
    const dirty = input.trim() !== "" && input !== loadedRaw && input !== result?.source;
    const guard = useDirtyGuard(dirty);
    const [confirmKind, setConfirmKind] = useState<{ kind: "example"; id: ExampleId } | { kind: "reset" }>({
        kind: "reset",
    });

    const loadExample = (id: ExampleId) => {
        const ex = exampleText(id);
        setExampleId(id);
        setInput(ex.raw);
        setResult({ source: ex.raw, corrected: ex.corrected });
    };
    const resetAll = () => {
        setExampleId(null);
        setInput("");
        setResult(null);
    };
    const pickExample = (id: ExampleId) => {
        setConfirmKind({ kind: "example", id });
        guard.run(() => loadExample(id));
    };
    const askReset = () => {
        setConfirmKind({ kind: "reset" });
        guard.run(resetAll);
    };
    const runCorrection = () => {
        sentRef.current = input;
        void call(input);
    };

    const ops = result && !stale ? diffWords(result.source, result.corrected) : [];
    const served = LOCALES.filter((l) => l.active);
    const langCode = detectLanguage(input, locale);
    const lang = LOCALES.find((l) => l.code === langCode) ?? served[0];
    const legend = { insert: t("legend.insert"), replace: t("legend.replace"), delete: t("legend.delete") };

    const startToolbar = (
        <div className="corrector__bar">
            <span
                className="corrector__lang"
                title={t("lockedTip")}
                aria-label={t("languageAria", { name: lang.native })}
            >
                <span className="corrector__flag" aria-hidden="true">
                    {lang.flag}
                </span>
                <span className="corrector__lang-name">{lang.native}</span>
                <svg className="corrector__lock" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
            </span>
            <span className="corrector__count">
                {stale && result ? (
                    <span className="corrector__modified" title={t("modifiedTip")}>
                        {t("modified")}
                    </span>
                ) : null}
                <span className="muted">{t("limit", { max: format.number(MAX_CHARS) })}</span>
                <b data-full={input.length >= MAX_CHARS || undefined}>
                    {format.number(input.length)} / {format.number(MAX_CHARS)}
                </b>
            </span>
        </div>
    );

    const action = (
        <div className="corrector__action">
            <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={pending}
                disabled={!AI_ENABLED || !canCall || input.trim() === ""}
                onClick={runCorrection}
                iconLeft={<Icon name="sparkles" size={18} animated />}
                className="corrector__run"
            >
                {pending ? `${t("running")} ${elapsed} s` : t("run")}
            </Button>
            {AI_ENABLED ? (
                <AiNotice
                    items={[t("notice.wait"), t("notice.thirdParty", { provider: "OpenRouter" }), t("notice.quality")]}
                />
            ) : null}
        </div>
    );

    const endToolbar = (
        <div className="corrector__bar corrector__bar--end">
            <CopyButton
                text={result && !stale ? result.corrected : ""}
                disabled={!result || stale || pending}
                label={t("copy")}
                onCopied={() => store.pushToast({ severity: "success", message: t("copied"), duration: 3000 })}
            />
        </div>
    );

    return (
        <section className="corrector" aria-label={t("run")}>
            <div className="corrector__examples">
                <span className="corrector__examples-label">
                    <Icon name="globe" size={16} /> {t("examplesLabel")} :
                </span>
                <ChoiceChips
                    ariaLabel={t("examplesLabel")}
                    options={EXAMPLE_IDS.map((id) => ({ value: id, label: t(`examples.${id}.label`) }))}
                    value={exampleId}
                    onChange={pickExample}
                    disabled={pending}
                />
                <span className="corrector__reset">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={askReset}
                        disabled={pending || (input === "" && result === null)}
                        ariaLabel={t("resetTip")}
                    >
                        ↻ {t("reset")}
                    </Button>
                </span>
            </div>
            <EditorPair
                className="corrector__pair"
                endId={END_ID}
                startToolbar={startToolbar}
                start={
                    <Textarea
                        id="corrector-input"
                        ariaLabel={t("inputLabel")}
                        value={input}
                        onChange={(v) => setInput(v.slice(0, MAX_CHARS))}
                        placeholder={t("inputPlaceholder")}
                        rows={EDITOR_ROWS}
                        maxLength={MAX_CHARS}
                        disabled={pending}
                    />
                }
                action={action}
                endToolbar={endToolbar}
                end={
                    <div
                        key={freshKey}
                        className={
                            freshKey > 0 && !stale ? "corrector__result corrector__result--fresh" : "corrector__result"
                        }
                    >
                        <DiffView
                            ops={ops}
                            ariaLabel={t("outputLabel")}
                            placeholder={t("outputPlaceholder")}
                            labels={legend}
                            rows={EDITOR_ROWS}
                        />
                        {result && !stale ? (
                            <CorrectorScore source={result.source} corrected={result.corrected} ops={ops} />
                        ) : null}
                        <DiffLegend labels={legend} />
                    </div>
                }
            />
            <ConfirmDialog
                open={guard.open}
                onClose={guard.cancel}
                onConfirm={guard.confirm}
                title={confirmKind.kind === "reset" ? t("resetConfirm.title") : t("confirm.title")}
                message={
                    confirmKind.kind === "reset"
                        ? t("resetConfirm.body")
                        : t("confirm.body", { label: t(`examples.${confirmKind.id}.label`) })
                }
                confirmLabel={confirmKind.kind === "reset" ? t("resetConfirm.confirm") : t("confirm.confirm")}
                cancelLabel={t("confirm.cancel")}
                tone="danger"
            />
        </section>
    );
}
