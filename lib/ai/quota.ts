import "server-only";
// SERVER AI quota (enforceable) — IO adapter of the lib/ai/quota-core.ts engine.
// Prod: Netlify Blobs with strong consistency + conditional writes (ETag), the only way
// to get counters shared across serverless invocations without losing increments.
// Dev/test (NODE_ENV !== production): process-local memory store.
// Store missing/failing in prod => AI_QUOTA_FAIL_MODE (default "closed": 503), always
// logged. The HARD financial cap remains the credit limit of the OpenRouter key.
import { AI_DAILY_LIMIT } from "@/constants/site";
import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";
import { AiError, clientErrorPayload } from "./errors";
import {
    bufferResponse,
    createMemoryStore,
    refund,
    reserve,
    withDeadline,
    type CasDeps,
    type CasStore,
    type QuotaTicket,
} from "./quota-core";
import { hashIp, readQuotaConfig } from "./quota-pure";

// Same source as the client (constants/site.ts, inlined at build time) => consistent limits.
const CONFIG = readQuotaConfig(process.env, AI_DAILY_LIMIT);
const IS_PROD = process.env.NODE_ENV === "production";
const STORE_NAME = "ai-quota";
const MAX_CAS_ATTEMPTS = 8;
const DEV_SECRET = "dev-quota-secret";
// Total quota budget per request (CAS reads + writes + retries). Generous compared to a
// normal Blobs latency (~tens of ms), well below the ~30 s function limit.
const STORE_DEADLINE_MS = 4_000;

// Memory singleton held by globalThis: each Route Handler may get its own
// instance of this module (separate bundles); without it /api/run and the dev reset
// would see different counters.
const devGlobal = globalThis as { __aiQuotaMemory?: CasStore };

// fetch given to @netlify/blobs. Three roles:
// 1. ORIGINAL fetch (not patched by Next, kept in `_nextOriginalFetch`): the patched
//    fetch duplicates every response via body.tee() for its cache, and Blobs does
//    `await res.body.cancel()` on a 404 => cancelling a tee branch never
//    resolves, the CAS read hangs (observed in prod: GET 404 in 30 ms, then stuck).
//    It also keeps Next from caching quota counters.
// 2. Body fully read (bufferResponse): safety net in case Next's internal property
//    disappears — a fresh Response with no pending stream can no longer hang on cancel.
// 3. Logging: Blobs retries silently on 429/5xx/network errors. Every HTTP failure
//    is logged (method + status, NEVER the URL: it may carry a signed token).
//    404 (missing key) and 412 (stale ETag, CAS) are normal protocol replies.
// AI_QUOTA_DEBUG=1: also traces the start and end of EVERY request (host only).
const DEBUG = process.env.AI_QUOTA_DEBUG === "1";
const originalFetch: typeof fetch =
    (globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch })._nextOriginalFetch ?? globalThis.fetch;

const blobsFetch: typeof fetch = async (input, init) => {
    const method = init?.method ?? "GET";
    const host = new URL(input instanceof Request ? input.url : String(input)).host;
    const t0 = Date.now();
    if (DEBUG)
        console.info(`[ai:quota] blobs → ${method} ${host} (original fetch: ${originalFetch !== globalThis.fetch})`);
    try {
        const res = await bufferResponse(await originalFetch(input, { ...init, cache: "no-store" }));
        if (DEBUG) console.info(`[ai:quota] blobs ← ${res.status} ${method} in ${Date.now() - t0} ms`);
        if (!res.ok && res.status !== 404 && res.status !== 412)
            console.error(`[ai:quota] blobs HTTP ${res.status} (${method})`);
        return res;
    } catch (error) {
        logError(`[ai:quota] blobs network error (${method} ${host}, ${Date.now() - t0} ms)`, error);
        throw error;
    }
};

function blobsStore(): CasStore {
    // getStore throws MissingBlobsEnvironmentError outside a Netlify context: caught further up.
    const store = getStore({ name: STORE_NAME, consistency: "strong", fetch: blobsFetch });
    return {
        async read(key) {
            const entry = await store.getWithMetadata(key, { type: "json" });
            if (!entry) return null;
            if (!entry.etag) throw new Error("quota: missing ETag");
            return { data: entry.data, etag: entry.etag };
        },
        async write(key, value, etag) {
            const result = await store.setJSON(key, value, etag === null ? { onlyIfNew: true } : { onlyIfMatch: etag });
            return result.modified;
        },
    };
}

function resolveDeps(): { deps: CasDeps; secret: string } {
    const secret = process.env.AI_QUOTA_SECRET ?? "";
    if (IS_PROD && secret.length < 32)
        throw new Error("quota: AI_QUOTA_SECRET missing or too short (>= 32 characters)");
    const store = IS_PROD ? blobsStore() : (devGlobal.__aiQuotaMemory ??= createMemoryStore());
    return {
        secret: secret || DEV_SECRET,
        deps: {
            store,
            maxAttempts: MAX_CAS_ATTEMPTS,
            rand: Math.random,
            sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
            log: logError,
        },
    };
}

function logError(message: string, error: unknown): void {
    const name = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`${message} — ${name}`);
}

export type QuotaGate = { ok: true; ticket: QuotaTicket | null } | { ok: false; error: AiError; retryAfter?: number };

/** Call BEFORE the LLM. ok:false => reply with quotaDeniedResponse(gate). */
export async function reserveQuota(ip: string): Promise<QuotaGate> {
    try {
        const { deps, secret } = resolveDeps();
        const outcome = await withDeadline(reserve(deps, CONFIG, hashIp(ip, secret), Date.now()), STORE_DEADLINE_MS);
        if (outcome.ok) return { ok: true, ticket: outcome.ticket };
        if (outcome.reason === "global") console.warn(`[ai:quota] global cap reached (${CONFIG.globalCap}/day)`);
        // Burst = transient ("busy", retry within the minute); daily/global = "rate".
        const code = outcome.reason === "burst" ? "busy" : "rate";
        return {
            ok: false,
            error: new AiError(code, undefined, 429),
            retryAfter: outcome.retryAfter,
        };
    } catch (error) {
        const open = CONFIG.failMode === "open";
        logError(
            open
                ? "[ai:quota] store unavailable, fail-open: quota NOT enforced"
                : "[ai:quota] store unavailable, fail-closed: 503",
            error,
        );
        if (open) return { ok: true, ticket: null };
        return {
            ok: false,
            error: new AiError("provider", "quota store unavailable", 503),
        };
    }
}

/** After an error or an empty reply: gives the credit back. Never throws. */
export async function refundQuota(ticket: QuotaTicket | null): Promise<void> {
    if (!ticket) return;
    try {
        await withDeadline(refund(resolveDeps().deps, ticket), STORE_DEADLINE_MS);
    } catch (error) {
        logError("[ai:quota] refund lost", error);
    }
}

/** DEV only: empties the memory store ("Reset limiter" button). No-op in prod. */
export function resetDevQuota(): boolean {
    if (IS_PROD) return false;
    devGlobal.__aiQuotaMemory = undefined;
    return true;
}

export function quotaDeniedResponse(gate: Extract<QuotaGate, { ok: false }>): NextResponse {
    return NextResponse.json(clientErrorPayload(gate.error), {
        status: gate.error.status,
        headers: gate.retryAfter === undefined ? undefined : { "Retry-After": String(gate.retryAfter) },
    });
}
