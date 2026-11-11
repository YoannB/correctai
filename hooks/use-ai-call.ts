"use client";
import { ApiError, postJson } from "@/lib/api";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { useDailyLimiter } from "./use-daily-limiter";
import { useAiPending, useStore } from "./use-store";
// One single place orchestrates: double-click guard (global pending), quota,
// increment, success/error toasts. Copy-pasting from one route to another = change the
// endpoint ONLY (never create a second hook, see docs/ai-capabilities.md). No setState
// in an effect (everything is event-driven).
//
// GENERALIZATION: the optional `buildBody` lets the SAME hook serve two
// body contracts: the legacy agent format {locale,input} (default, => /api/hello) and the
// unified format {prompt,agentId,skillId,inputs} (=> /api/run). pending/canCall come from
// the store's GLOBAL state, so any call in progress disables all AI buttons at once
// (on purpose: a single AI call at a time in the app).
//
// CREDIT INVARIANT: postJson THROWS on !res.ok (502/504/429), so the catch branch
// consumes nothing. increment() is AFTER the `await`, AFTER the `if (!reply)` guard AND
// AFTER `onSuccess` accepted the reply: a credit is consumed ONLY on a genuinely useful reply
// (non-empty text the app could use).
//
// CONSUMING THE REPLY: by default a useful reply is shown as a success toast (demo
// behavior). Pass `onSuccess` to hand the trimmed reply to the app instead (fill an output
// field, diff it, scroll to it): the success toast is then skipped, everything else (guard,
// quota, error toasts) stays here. `onSuccess` may return `false` to REJECT an unusable reply
// (e.g. an output contract the model broke): the hook then shows the generic error toast and
// consumes no credit, exactly like an empty reply. Returning nothing (void) accepts it. Like
// `buildBody`, keep it a stable reference (module level or useCallback), otherwise `call`
// changes on every render.
export type AiCallCtx = { locale: string; input?: string };
export function useAiCall(
    endpoint = "/api/hello",
    buildBody: (ctx: AiCallCtx) => unknown = ({ locale, input }) => ({
        locale,
        input,
    }),
    onSuccess?: (reply: string) => boolean | void,
) {
    const store = useStore();
    const pending = useAiPending();
    const { canCall, increment } = useDailyLimiter();
    const locale = useLocale();
    const te = useTranslations("errors");
    const call = useCallback(
        async (input?: string) => {
            if (pending || !canCall) return; // block re-click / editing during the call
            store.setAiPending(true);
            try {
                const { text } = await postJson<{ text: string }>(endpoint, buildBody({ locale, input }));
                const reply = (text ?? "").trim();
                // Empty reply (silent free model): report it, and leave BEFORE the increment.
                if (!reply) {
                    store.pushToast({
                        severity: "error",
                        message: te("empty"),
                        duration: 6000,
                    });
                    return;
                }
                // Reply rejected by the app (unusable): report it, and leave BEFORE the increment.
                if (onSuccess?.(reply) === false) {
                    store.pushToast({
                        severity: "error",
                        message: te("generic"),
                        duration: 6000,
                    });
                    return;
                }
                increment(); // exactly once, here, only on a useful reply.
                if (!onSuccess)
                    store.pushToast({
                        severity: "success",
                        message: reply,
                        duration: 8000,
                    });
            } catch (e) {
                // Network / provider / timeout / rate error: postJson threw, increment() is never reached.
                const code = e instanceof ApiError ? e.code : "generic";
                store.pushToast({
                    severity: "error",
                    message: te(code),
                    duration: 6000,
                });
            } finally {
                store.setAiPending(false);
            }
        },
        [pending, canCall, store, increment, locale, te, endpoint, buildBody, onSuccess],
    );
    return { call, pending, canCall };
}
